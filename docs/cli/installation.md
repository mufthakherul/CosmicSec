# CosmicSec CLI Installation & Distribution

## Local editable install

```bash
cd cli/agent
pip install -e .
```

## pipx install (recommended for users)

```bash
pipx install cosmicsec-agent
cosmicsec-agent --version
```

## Homebrew tap workflow (maintainers)

1. Build and publish a release tarball for the CLI tag.
2. Compute SHA256 for the artifact.
3. Update `cli/agent/homebrew/cosmicsec-agent.rb`:
   - `url` to release tarball
   - `sha256` value
4. Publish formula in a tap repo (for example `cosmicsec/homebrew-tap`).

User install example:

```bash
brew tap cosmicsec/tap
brew install cosmicsec-agent
```

## Man page generation

Regenerate the CLI man page after command-surface changes:

```bash
python scripts/generate-cli-manpage.py
```

Output:

- `docs/cli/cosmicsec-agent.1`
