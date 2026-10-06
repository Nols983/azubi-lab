#!/bin/sh

# Load a supported variable from its Docker Secrets-style *_FILE companion.
# Direct variables remain supported for the portable Compose deployment.
load_secret_file_env() {
  secret_variable=$1

  case "$secret_variable" in
    DATABASE_URL)
      secret_direct_value=${DATABASE_URL-}
      secret_file_path=${DATABASE_URL_FILE-}
      ;;
    AUTH_SECRET)
      secret_direct_value=${AUTH_SECRET-}
      secret_file_path=${AUTH_SECRET_FILE-}
      ;;
    WEB_PUSH_VAPID_PRIVATE_KEY)
      secret_direct_value=${WEB_PUSH_VAPID_PRIVATE_KEY-}
      secret_file_path=${WEB_PUSH_VAPID_PRIVATE_KEY_FILE-}
      ;;
    ADMIN_PASSWORD)
      secret_direct_value=${ADMIN_PASSWORD-}
      secret_file_path=${ADMIN_PASSWORD_FILE-}
      ;;
    PGPASSWORD)
      secret_direct_value=${PGPASSWORD-}
      secret_file_path=${PGPASSWORD_FILE-}
      ;;
    *)
      echo "Refusing unsupported secret variable." >&2
      return 1
      ;;
  esac

  if [ -n "$secret_direct_value" ] && [ -n "$secret_file_path" ]; then
    echo "Configure either $secret_variable or ${secret_variable}_FILE, not both." >&2
    return 1
  fi

  [ -n "$secret_file_path" ] || return 0

  case "$secret_file_path" in
    /*) ;;
    *)
      echo "${secret_variable}_FILE must use an absolute path." >&2
      return 1
      ;;
  esac

  if [ ! -f "$secret_file_path" ] || [ -L "$secret_file_path" ] || [ ! -r "$secret_file_path" ]; then
    echo "${secret_variable}_FILE is unavailable or unsafe." >&2
    return 1
  fi

  secret_file_value=$(cat "$secret_file_path")
  if [ -z "$secret_file_value" ]; then
    echo "${secret_variable}_FILE is empty." >&2
    return 1
  fi

  case "$secret_variable" in
    DATABASE_URL)
      DATABASE_URL=$secret_file_value
      export DATABASE_URL
      ;;
    AUTH_SECRET)
      AUTH_SECRET=$secret_file_value
      export AUTH_SECRET
      ;;
    WEB_PUSH_VAPID_PRIVATE_KEY)
      WEB_PUSH_VAPID_PRIVATE_KEY=$secret_file_value
      export WEB_PUSH_VAPID_PRIVATE_KEY
      ;;
    ADMIN_PASSWORD)
      ADMIN_PASSWORD=$secret_file_value
      export ADMIN_PASSWORD
      ;;
    PGPASSWORD)
      PGPASSWORD=$secret_file_value
      export PGPASSWORD
      ;;
  esac

  unset secret_file_value
}
