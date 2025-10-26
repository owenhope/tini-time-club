# Environment Configuration - EAS Environment Variables

This project uses [EAS Environment Variables](https://docs.expo.dev/eas/environment-variables/) to manage different environments properly.

## The EAS Way

### 1. Set Environment Variables in EAS

**Create environment variables for each environment:**

```bash
# List existing environment variables
eas env:list --environment development
eas env:list --environment production

# Create new environment variables
eas env:create
```

**For production, create these environment variables:**

- `EXPO_PUBLIC_SUPABASE_URL` (Plain text)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Plain text)
- `APP_ENV` (Plain text)
- `EXPO_PUBLIC_DEVELOPMENT` (Plain text)

### 2. Direct EAS Commands

**Environment-Specific Updates:**

```bash
# Push to development with development environment
eas update --channel development --environment development

# Push to production with production environment
eas update --channel production --environment production
```

**Build Commands:**

```bash
# Build development
eas build --profile development

# Build production
eas build --profile production
```

**Environment Management:**

```bash
# List environment variables
eas env:list --environment development
eas env:list --environment production

# Create new environment variable
eas env:create

# Pull development env vars to local .env file
eas env:pull --environment development
```

## How It Works

- **Development builds** use the `development` environment variables from EAS
- **Production builds** use the `production` environment variables from EAS
- **Updates** use the `--environment` flag to ensure correct variables are used
- **Local development** can use `npm run env:pull` to sync EAS variables locally

## Environment Variables

| Variable                        | Development   | Production   |
| ------------------------------- | ------------- | ------------ |
| `APP_ENV`                       | `development` | `production` |
| `EXPO_PUBLIC_DEVELOPMENT`       | `true`        | `false`      |
| `EXPO_PUBLIC_SUPABASE_URL       | Local dev     | EAS secret   |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Local dev     | EAS secret   |

## Quick Fix for Your Issue

Since you accidentally pushed development environment to production:

1. **Create production environment variables:**

   ```bash
   # Create the environment variables for production
   eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "your_prod_url"
   eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_prod_key"
   eas env:create --environment production --name APP_ENV --value "production"
   eas env:create --environment production --name EXPO_PUBLIC_DEVELOPMENT --value "false"
   ```

2. **Push the correct environment:**
   ```bash
   eas update --channel production --environment production
   ```

That's it! Using the official [EAS Environment Variables](https://docs.expo.dev/eas/environment-variables/) system.
