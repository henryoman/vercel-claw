# 1. Download the archive and its checksum
curl -sLO https://github.com/googleworkspace/cli/releases/download/v0.22.5/google-workspace-cli-<target>.tar.gz
curl -sLO https://github.com/googleworkspace/cli/releases/download/v0.22.5/google-workspace-cli-<target>.tar.gz.sha256

# 2. Verify the checksum
shasum -a 256 -c google-workspace-cli-<target>.tar.gz.sha256

# 3. Extract and install
tar -xzf google-workspace-cli-<target>.tar.gz
chmod +x gws
sudo mv gws /usr/local/bin/