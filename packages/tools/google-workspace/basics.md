# Google Workspace CLI Basics

Most common `gws` commands for day-to-day Gmail, Calendar, Drive, Docs, Sheets, Chat, and Tasks work.

## Core Setup

```bash
# Sign in with browser-based OAuth
gws auth login

# Generate/update the local skill docs
gws generate-skills
```

## Discover Commands First

```bash
# Show available services
gws --help

# Show commands for one service
gws gmail --help
gws calendar --help
gws drive --help
gws sheets --help
gws docs --help

# Inspect the exact schema for a raw API method
gws schema gmail.users.messages.list
gws schema calendar.events.insert
gws schema drive.files.list
gws schema sheets.spreadsheets.values.get
gws schema docs.documents.batchUpdate
```

## Useful Global Flags

```bash
# Friendly table output
--format table

# Return JSON/YAML/CSV when needed
--format json
--format yaml
--format csv

# Validate a write request without sending it
--dry-run

# Auto-paginate list results
--page-all
```

## Gmail

```bash
# Quick unread inbox summary
gws gmail +triage
gws gmail +triage --max 10
gws gmail +triage --query 'from:boss newer_than:7d'

# Send an email
gws gmail +send --to alice@example.com --subject 'Hello' --body 'Hi Alice!'

# Send with attachment
gws gmail +send --to alice@example.com --subject 'Report' --body 'See attached' --attach ./report.pdf

# Read a raw Gmail API resource
gws schema gmail.users.messages.get
gws gmail users getProfile --params '{"userId":"me"}'
```

## Calendar

```bash
# See upcoming events
gws calendar +agenda
gws calendar +agenda --today
gws calendar +agenda --week --format table

# Create an event
gws calendar +insert --summary 'Standup' --start '2026-04-06T09:00:00-07:00' --end '2026-04-06T09:30:00-07:00'

# Create an event with Meet link
gws calendar +insert --summary 'Client Call' --start '2026-04-06T13:00:00-07:00' --end '2026-04-06T13:30:00-07:00' --meet

# Raw API list call
gws calendar events list --params '{"calendarId":"primary","maxResults":10,"singleEvents":true,"orderBy":"startTime"}'
```

## Drive

```bash
# List files
gws drive files list --params '{"pageSize":10,"trashed":false}'

# Search files
gws drive files list --params "{\"q\":\"name contains 'report' and trashed=false\",\"pageSize\":10}"

# Upload a local file
gws drive +upload ./report.pdf
gws drive +upload ./report.pdf --parent FOLDER_ID

# Get file metadata
gws drive files get --params '{"fileId":"FILE_ID","fields":"id,name,webViewLink,mimeType"}'
```

## Sheets

```bash
# Read a range
gws sheets +read --spreadsheet SHEET_ID --range "Sheet1!A1:D10"

# Append one row
gws sheets +append --spreadsheet SHEET_ID --range "Sheet1!A1" --values 'Alice,100,true'

# Append multiple rows
gws sheets +append --spreadsheet SHEET_ID --json-values '[["Alice","100"],["Bob","200"]]'

# Raw API metadata fetch
gws sheets spreadsheets get --params '{"spreadsheetId":"SHEET_ID"}'
```

## Docs

```bash
# Read document metadata/content structure
gws docs documents get --params '{"documentId":"DOC_ID"}'

# Append plain text to a doc
gws docs +write --document DOC_ID --text 'Weekly update goes here.'

# Inspect rich-edit schema before batch updates
gws schema docs.documents.batchUpdate
```

## Chat

```bash
# List spaces
gws chat spaces list

# Inspect message send schema
gws schema chat.spaces.messages.create
```

## Tasks

```bash
# List task lists
gws tasks tasklists list

# List tasks in a list
gws tasks tasks list --params '{"tasklist":"TASKLIST_ID"}'

# Inspect create-task schema
gws schema tasks.tasks.insert
```

## Good Defaults

```bash
# Explore before writing
gws <service> --help
gws schema <service>.<resource>.<method>

# Safer write flow
gws <service> <resource> <method> --dry-run
gws <service> <resource> <method>
```

## zsh Note

If you use zsh, quote sheet ranges with double quotes so `!` is not treated as shell history:

```bash
gws sheets +read --spreadsheet SHEET_ID --range "Sheet1!A1:D10"
```
