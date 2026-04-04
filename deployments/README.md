# Editable Deployment Area

This directory is the human-editable control plane for generated instances.

- `default/shared` contains deployment-wide defaults shared by every instance.
- `default/instances/000` contains per-instance overrides for the first instance.
- Shared code still lives in `apps/`, `packages/`, `tools/`, and `connectors/`.

Gate mode is configured in each `instance.json`.

- Use `"member"` as the safe default for authenticated access.
- Use `"password"` only with a secret reference such as `passwordSecretName`; do not store hashes or plaintext passwords in repo files.
- Use `"public"` only for intentionally open instances.
