# improve-ticket.ps1 - audit an existing TOPX ticket against the ticket quality bar,
# and optionally replace its description with a rewritten one.
#
# Read-only unless -Update is given. Auditing never modifies the ticket.
#
# Why: most tickets that stall are not wrong, they are incomplete - no steps,
# no expected/actual, no AC, no parent. This prints exactly what is missing so
# the gap can be filled or marked <can bo sung tai lieu> instead of guessed.
#
# Examples:
#   .\improve-ticket.ps1 -Key TOPX-207
#   .\improve-ticket.ps1 -Key TOPX-207 -DescriptionFile .\rewritten.md -Update

param(
  [Parameter(Mandatory)]
  [string]$Key,

  [string]$DescriptionFile,

  [switch]$Update,

  [switch]$ShowDescription
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message, [int]$Code) {
  Write-Output ("REJECTED: " + $Message)
  exit $Code
}

function Flat([string]$Text) {
  if (-not $Text) { return '' }
  return ($Text.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', '')
}

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
  $issue = Invoke-RestMethod -Uri ($base + '/rest/api/2/issue/' + $Key + '?fields=summary,description,status,priority,issuetype,assignee,parent,created,updated,attachment,comment') -Headers $headers -Method GET
} catch {
  $code = 0
  if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
  Fail ("HTTP " + $code + " on GET /issue/" + $Key) 3
}

$f = $issue.fields
$desc = [string]$f.description
$flat = Flat $desc
$summary = [string]$f.summary
$problems = @()
$warns = @()

if ($summary -notmatch '(?i)^\s*\[(B2C|PROD|EE|DEV-EE|PROD-EE|STG-EE)\]\[(WEB|App|BE|QC)\]') { $problems += 'summary thieu tag [PRODUCT-ENV][SURFACE]' }
if ([string]::IsNullOrWhiteSpace($desc)) { $problems += 'description trong' }
else {
  if ($desc.Length -lt 200) { $warns += ('description ngan (' + $desc.Length + ' ky tu)') }
  if ($flat -notmatch '(?i)(cac buoc|steps?|repro)') { $problems += 'thieu muc STEPS' }
  if ($flat -notmatch '(?i)(ky vong|expected|expect)') { $problems += 'thieu muc EXPECTED' }
  if ($flat -notmatch '(?i)(thuc te|actual)') { $problems += 'thieu muc ACTUAL' }
  if ($flat -notmatch '(?i)(moi truong|environment|env)') { $problems += 'thieu muc ENV' }
  if ($flat -notmatch '(?i)(acceptance|tieu chi chap nhan|AC-\d)') { $warns += 'chua co acceptance criteria' }
}
if ($f.issuetype.name -eq 'Sub-task' -and -not $f.parent) { $problems += 'Sub-task thieu parent' }
if (-not $f.assignee) { $warns += 'chua co assignee' }
if (@($f.attachment).Count -eq 0) { $warns += 'khong co attachment (bug UI nen co anh/video)' }
if (@($f.comment.comments).Count -eq 0) { $warns += 'khong co comment nao' }

$ageDays = [int]((New-TimeSpan -Start ([datetime]$f.updated) -End (Get-Date)).TotalDays)

Write-Output ('TICKET=' + $issue.key + ' | ' + $f.issuetype.name + ' | ' + $f.status.name + ' | ' + $f.priority.name + ' | asg=' + $(if ($f.assignee) { $f.assignee.name } else { '-' }))
Write-Output ('SUMMARY=' + $summary)
Write-Output ('AGE_SINCE_UPDATE_DAYS=' + $ageDays)
if ($ShowDescription) { Write-Output '--- description ---'; Write-Output $desc }

if ($problems.Count -eq 0) { Write-Output '[OK] du 4 muc bat buoc va tag summary' }
foreach ($p in $problems) { Write-Output ('[MISSING] ' + $p) }
foreach ($w in $warns) { Write-Output ('[WARN] ' + $w) }

$ready = ($problems.Count -eq 0)
Write-Output ('READY=' + $ready)

if ($Update) {
  if (-not $DescriptionFile) { Fail '-Update requires -DescriptionFile' 2 }
  if (-not (Test-Path $DescriptionFile)) { Fail ('description file not found: ' + $DescriptionFile) 2 }
  $newDesc = [System.IO.File]::ReadAllText((Resolve-Path $DescriptionFile), [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
  if ([string]::IsNullOrWhiteSpace($newDesc)) { Fail 'new description is empty - refusing to wipe the ticket' 5 }
  $flatNew = Flat $newDesc
  foreach ($need in @(@('STEPS', '(?i)(cac buoc|steps?|repro)'), @('EXPECTED', '(?i)(ky vong|expected|expect)'), @('ACTUAL', '(?i)(thuc te|actual)'), @('ENV', '(?i)(moi truong|environment|env)'))) {
    if ($flatNew -notmatch $need[1]) { Fail ('new description is missing ' + $need[0] + ' - see references/ticket-template.md') 5 }
  }
  $payload = @{ fields = @{ description = $newDesc } } | ConvertTo-Json -Depth 5
  try {
    Invoke-RestMethod -Uri ($base + '/rest/api/2/issue/' + $Key) -Headers $headers -Method PUT -Body ([System.Text.Encoding]::UTF8.GetBytes($payload)) | Out-Null
  } catch {
    $code = 0
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    Fail ("HTTP " + $code + " on PUT /issue/" + $Key) 3
  }
  $check = Invoke-RestMethod -Uri ($base + '/rest/api/2/issue/' + $Key + '?fields=description') -Headers $headers -Method GET
  $after = [string]$check.fields.description
  Write-Output ('UPDATED=' + $Key + ' DESC_LEN=' + $after.Length + ' MATCH=' + ($after -ceq $newDesc))
} else {
  Write-Output '--- dry run: description not changed. Re-run with -DescriptionFile ... -Update to write. ---'
}
