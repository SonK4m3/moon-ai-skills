# new-ticket.ps1 - create a TOPX Jira ticket from a description file.
#
# Dry run by default: prints the JSON payload and validates the ticket shape.
# Add -Create to actually POST (requires the Jira opt-in flag).
#
# Why: ticket quality fails in predictable ways (missing env tag, missing
# expected/actual). The checks below block those before a request is sent.
#
# Examples:
#   .\new-ticket.ps1 -Type Bug -Summary "[DEV-EE][WEB] ..." -DescriptionFile .\ticket.md
#   .\new-ticket.ps1 -Type Bug -Summary "[DEV-EE][WEB] ..." -DescriptionFile .\ticket.md -Create

param(
  [Parameter(Mandatory)]
  [ValidateSet('Bug', 'Task', 'Sub-task', 'Story')]
  [string]$Type,

  [Parameter(Mandatory)]
  [string]$Summary,

  [Parameter(Mandatory)]
  [string]$DescriptionFile,

  [ValidateSet('Critical/ High', 'High', 'Medium', 'Low', 'Minor')]
  [string]$Priority = 'Medium',

  [string]$Parent,
  [string]$Assignee,
  [string[]]$Labels,
  [string]$Project = 'TOPX',
  [switch]$Create
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message, [int]$Code) {
  Write-Output ("REJECTED: " + $Message)
  exit $Code
}

# --- validation -------------------------------------------------------------

$tagPattern = '(?i)^\s*\[(B2C|PROD|EE|DEV-EE|PROD-EE|STG-EE)\]\[(WEB|App|BE|QC)\]'
if ($Summary -notmatch $tagPattern) {
  Fail "summary must start with [PRODUCT-ENV][SURFACE], e.g. [DEV-EE][WEB] ... (got: $Summary)" 5
}

if (-not (Test-Path $DescriptionFile)) {
  Fail "description file not found: $DescriptionFile" 2
}

$desc = [System.IO.File]::ReadAllText((Resolve-Path $DescriptionFile), [System.Text.Encoding]::UTF8)
# Defensive: a stray BOM at the start would render as an invisible char before the first heading.
$desc = $desc.TrimStart([char]0xFEFF)
if ([string]::IsNullOrWhiteSpace($desc)) { Fail "description file is empty" 2 }
if ($desc.Length -lt 200) { Fail ("description too short (" + $desc.Length + " chars) - a workable ticket needs context, steps and expected/actual") 5 }

# Strip diacritics so "Các bước", "Cac buoc" and "Steps" all match the same pattern.
$flat = $desc.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', ''
$missing = @()
if ($flat -notmatch '(?i)(cac buoc|steps?|repro)') { $missing += 'STEPS' }
if ($flat -notmatch '(?i)(ky vong|expected|expect)') { $missing += 'EXPECTED' }
if ($flat -notmatch '(?i)(thuc te|actual)') { $missing += 'ACTUAL' }
if ($flat -notmatch '(?i)(moi truong|environment|env)') { $missing += 'ENV' }
if ($missing.Count -gt 0) {
  Fail ("description is missing required section(s): " + ($missing -join ', ') + " - see references/ticket-template.md") 5
}

if ($Type -eq 'Sub-task' -and -not $Parent) {
  Fail "Sub-task requires -Parent" 5
}

# --- payload ----------------------------------------------------------------

$fields = @{
  project   = @{ key = $Project }
  summary   = $Summary.Trim()
  issuetype = @{ name = $Type }
  priority  = @{ name = $Priority }
  description = $desc
}
if ($Parent) { $fields.parent = @{ key = $Parent } }
if ($Assignee) { $fields.assignee = @{ name = $Assignee } }
if ($Labels) { $fields.labels = @($Labels) }

$payload = @{ fields = $fields } | ConvertTo-Json -Depth 8

Write-Output ('TYPE=' + $Type + ' PRIORITY=' + $Priority + ' LEN=' + $desc.Length)
Write-Output '--- payload ---'
Write-Output $payload

if (-not $Create) {
  Write-Output '--- dry run: nothing sent. Re-run with -Create to create the ticket. ---'
  exit 0
}

# --- create -----------------------------------------------------------------

$userHome = $env:USERPROFILE
if (-not (Test-Path (Join-Path $userHome '.jira\ENABLED'))) {
  Fail 'Jira is off. Run jira-dc.ps1 on first, then off when done.' 4
}

$base = if ($env:JIRA_BASE_URL) { $env:JIRA_BASE_URL } elseif (Test-Path (Join-Path $userHome '.jira\base.txt')) { (Get-Content (Join-Path $userHome '.jira\base.txt') -Raw).Trim() } else { 'https://projects.plan-task.dev' }
$base = $base.TrimEnd('/')
$token = if ($env:JIRA_PAT) { $env:JIRA_PAT } elseif (Test-Path (Join-Path $userHome '.jira\pat.txt')) { (Get-Content (Join-Path $userHome '.jira\pat.txt') -Raw) } else { $null }
if (-not $token) { Fail 'NO_CREDENTIAL: save your Jira PAT to %USERPROFILE%\.jira\pat.txt' 2 }
$token = ($token -replace '\s', '')
$headers = @{ Authorization = ('Bearer ' + $token); Accept = 'application/json'; 'Content-Type' = 'application/json' }

try {
  $r = Invoke-RestMethod -Uri ($base + '/rest/api/2/issue') -Headers $headers -Method POST -Body ([System.Text.Encoding]::UTF8.GetBytes($payload))
} catch {
  $code = 0
  if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
  $detail = if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
  Fail ("HTTP " + $code + " on POST /issue :: " + $detail) 3
}

Write-Output ('CREATED=' + $r.key + ' URL=' + $base + '/browse/' + $r.key)
