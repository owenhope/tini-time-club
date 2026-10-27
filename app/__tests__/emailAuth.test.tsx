import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import EmailAuth from "@/app/auth/email";
import { REVIEWER_EMAIL, isReviewerEmail } from "@/utils/reviewerAccount";

const mockContinueWithEmail = jest.fn(async (_email: string) => true);
const mockSignInWithPassword = jest.fn(
  async (_email: string, _password: string) => true
);

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), dismissTo: jest.fn() }),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    loading: false,
    continueWithEmail: (email: string) => mockContinueWithEmail(email),
    signInWithPassword: (email: string, password: string) =>
      mockSignInWithPassword(email, password),
  }),
}));

jest.mock("@/components/nav/AppHeader", () => () => null);

jest.mock("@/components/shared", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    Button: (props: object) => React.createElement("Button", props),
    Input: (props: object) => React.createElement("Input", props),
  };
});

jest.mock("@/theme", () => {
  const theme = {
    colors: {
      accent: "accent",
      background: "background",
      tabBarActive: "active",
      text: "text",
      textOnImage: "white",
      textSecondary: "secondary",
    },
    radius: { input: 12, pill: 999 },
    spacing: { xs: 4, md: 16, lg: 24, xl: 32, xxl: 48 },
    typography: { body: {}, bodyStrong: {}, display: {} },
  };

  return {
    makeStyles: (factory: (value: typeof theme) => object) => () =>
      factory(theme),
    useTheme: () => theme,
  };
});

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

describe("reviewer account", () => {
  it("matches only the reviewer address, ignoring case and spaces", () => {
    expect(isReviewerEmail(` ${REVIEWER_EMAIL.toUpperCase()} `)).toBe(true);
    expect(isReviewerEmail("member@example.com")).toBe(false);
  });
});

describe("EmailAuth", () => {
  let renderer: ReactTestRenderer | undefined;

  beforeEach(() => {
    mockContinueWithEmail.mockClear();
    mockSignInWithPassword.mockClear();
  });

  afterEach(() => {
    act(() => renderer?.unmount());
  });

  const typeInto = (label: string, value: string) =>
    act(() => {
      renderer!.root.findByProps({ label }).props.onChangeText(value);
    });

  it("sends a magic link and shows no password field for members", async () => {
    act(() => {
      renderer = create(<EmailAuth />);
    });
    typeInto("Email address", "Member@Example.com");

    expect(renderer!.root.findAllByProps({ label: "Password" })).toHaveLength(
      0
    );

    await act(async () => {
      renderer!.root
        .findByProps({ title: "Continue with Email" })
        .props.onPress();
    });

    expect(mockContinueWithEmail).toHaveBeenCalledWith("member@example.com");
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("signs the reviewer in with a password instead of a magic link", async () => {
    act(() => {
      renderer = create(<EmailAuth />);
    });
    typeInto("Email address", REVIEWER_EMAIL);
    typeInto("Password", "reviewer-secret");

    await act(async () => {
      renderer!.root.findByProps({ title: "Sign In" }).props.onPress();
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith(
      REVIEWER_EMAIL,
      "reviewer-secret"
    );
    expect(mockContinueWithEmail).not.toHaveBeenCalled();
  });
});
