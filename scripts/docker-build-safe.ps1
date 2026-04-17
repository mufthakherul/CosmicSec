param(
    [string[]]$Services = @(),
    [switch]$NoCache
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
    $composeFiles = @("-f", "docker-compose.yml", "-f", "docker-compose.dev.yml")

    function Invoke-ComposeBuild([bool]$legacy) {
        $buildArgs = @("compose") + $composeFiles + @("build")
        if ($NoCache) { $buildArgs += "--no-cache" }
        if ($Services.Count -gt 0) { $buildArgs += $Services }

        if ($legacy) {
            Write-Host "Retrying build with legacy builder fallback..." -ForegroundColor Yellow
            $env:DOCKER_BUILDKIT = "0"
            $env:COMPOSE_DOCKER_CLI_BUILD = "0"
        }
        else {
            Remove-Item Env:DOCKER_BUILDKIT -ErrorAction SilentlyContinue
            Remove-Item Env:COMPOSE_DOCKER_CLI_BUILD -ErrorAction SilentlyContinue
        }

        & docker @buildArgs
    }

    try {
        Invoke-ComposeBuild -legacy:$false
    }
    catch {
        $firstError = $_.Exception.Message
        if ($firstError -match "EOF|Internal Server Error|rpc error|error reading from server") {
            Write-Host "BuildKit instability detected: $firstError" -ForegroundColor Yellow
            Write-Host "Pruning dangling build cache before retry..." -ForegroundColor Yellow
            & docker builder prune -f | Out-Null
            Invoke-ComposeBuild -legacy:$true
        }
        else {
            throw
        }
    }
}
finally {
    Pop-Location
}
