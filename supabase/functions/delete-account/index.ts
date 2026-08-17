/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from "npm:@supabase/supabase-js@2.47.16";
import {
  createAppleClientSecret,
  exchangeAndRevokeAppleAuthorization,
} from "./appleTokenRevocation.ts";

const STORAGE_BUCKETS = ["avatars", "review_images"] as const;
const STORAGE_PAGE_SIZE = 1000;
const STORAGE_DELETE_BATCH_SIZE = 100;

type AdminClient = ReturnType<typeof createClient>;
type AuthUserWithIdentities = {
  identities?: Array<{
    id: string;
    identity_data?: Record<string, unknown>;
    provider: string;
  }>;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function getAdminClient(): AdminClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service credentials are not configured");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

const requiredEnvironmentVariable = (name: string): string => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};

const appleIdentitySubject = (user: AuthUserWithIdentities): string | null => {
  const identity = user?.identities?.find(
    (candidate) => candidate.provider === "apple"
  );
  if (!identity) return null;

  return typeof identity.identity_data?.sub === "string"
    ? identity.identity_data.sub
    : identity.id;
};

const revokeAppleAuthorizationIfNeeded = async (
  request: Request,
  user: AuthUserWithIdentities
): Promise<void> => {
  const expectedSubject = appleIdentitySubject(user);
  if (!expectedSubject) return;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const appleAuthorization =
    typeof body === "object" &&
    body !== null &&
    "appleAuthorization" in body &&
    typeof body.appleAuthorization === "object" &&
    body.appleAuthorization !== null
      ? body.appleAuthorization
      : null;
  const authorizationCode =
    appleAuthorization &&
    "authorizationCode" in appleAuthorization &&
    typeof appleAuthorization.authorizationCode === "string"
      ? appleAuthorization.authorizationCode.trim()
      : "";
  const clientId =
    appleAuthorization &&
    "clientId" in appleAuthorization &&
    typeof appleAuthorization.clientId === "string"
      ? appleAuthorization.clientId.trim()
      : "";

  if (!authorizationCode || !clientId) {
    throw new Error("Fresh Sign in with Apple authorization is required");
  }

  const clientSecret = await createAppleClientSecret({
    clientId,
    keyId: requiredEnvironmentVariable("APPLE_KEY_ID"),
    privateKey: requiredEnvironmentVariable("APPLE_PRIVATE_KEY"),
    teamId: requiredEnvironmentVariable("APPLE_TEAM_ID"),
  });

  await exchangeAndRevokeAppleAuthorization({
    authorizationCode,
    clientId,
    clientSecret,
    expectedSubject,
  });
};

async function listOwnedPaths(
  admin: AdminClient,
  bucket: (typeof STORAGE_BUCKETS)[number],
  userId: string
): Promise<string[]> {
  const paths: string[] = [];

  for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
    const { data, error } = await admin.storage.from(bucket).list(userId, {
      limit: STORAGE_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw error;

    const page = data ?? [];
    for (const object of page) {
      // Uploads use one user-id directory followed by the generated filename.
      // Ignore directory placeholders rather than attempting a broad removal.
      if (object.id) paths.push(`${userId}/${object.name}`);
    }

    if (page.length < STORAGE_PAGE_SIZE) break;
  }

  return paths;
}

async function deleteOwnedStorage(
  admin: AdminClient,
  userId: string
): Promise<void> {
  for (const bucket of STORAGE_BUCKETS) {
    const paths = await listOwnedPaths(admin, bucket, userId);

    for (
      let index = 0;
      index < paths.length;
      index += STORAGE_DELETE_BATCH_SIZE
    ) {
      const { error } = await admin.storage
        .from(bucket)
        .remove(paths.slice(index, index + STORAGE_DELETE_BATCH_SIZE));
      if (error) throw error;
    }
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const token = bearerToken(request);
  if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

  try {
    const admin = getAdminClient();
    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Apple expects its authorization to be revoked as part of account
    // deletion. Do this before removing any user data so a failed exchange or
    // revocation leaves the account intact and retryable.
    await revokeAppleAuthorizationIfNeeded(request, user);

    await deleteOwnedStorage(admin, user.id);

    const { error: dataError } = await admin.rpc("delete_account_data", {
      p_user_id: user.id,
    });
    if (dataError) throw dataError;

    const { error: authError } = await admin.auth.admin.deleteUser(user.id);
    if (authError) throw authError;

    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error("Account deletion failed:", error);
    return jsonResponse({ error: "Account deletion failed" }, 500);
  }
});
