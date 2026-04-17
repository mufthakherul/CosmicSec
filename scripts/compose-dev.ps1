param(
    [ValidateSet("up", "build", "rebuild", "down", "ps", "logs")]
    [string]$Action = "up",
    [switch]$Detached,
    [switch]$NoCache,
    [string[]]$Services
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
    $composeFiles = @("-f", "docker-compose.yml", "-f", "docker-compose.dev.yml")

    switch ($Action) {
        "up" {
            $args = @("compose") + $composeFiles + @("up")
            if ($Detached) { $args += "-d" }
            if ($NoCache) { $args += "--build"; $args += "--force-recreate" }
            if ($Services.Count -gt 0) { $args += $Services }
            & docker @args
        }
        "build" {
            if ($Detached) {
                Write-Host "Hint: 'build -d' is not a valid docker compose command. Running 'up -d --build' instead." -ForegroundColor Yellow
                $args = @("compose") + $composeFiles + @("up", "-d", "--build")
                if ($NoCache) { $args += "--force-recreate" }
                if ($Services.Count -gt 0) { $args += $Services }
                & docker @args
            }
            else {
                $args = @("compose") + $composeFiles + @("build")
                if ($NoCache) { $args += "--no-cache" }
                if ($Services.Count -gt 0) { $args += $Services }
                & docker @args
            }
        }
        "rebuild" {
            $argsBuild = @("compose") + $composeFiles + @("build", "--no-cache")
            if ($Services.Count -gt 0) { $argsBuild += $Services }
            & docker @argsBuild

            $argsUp = @("compose") + $composeFiles + @("up", "-d", "--force-recreate")
            if ($Services.Count -gt 0) { $argsUp += $Services }
            & docker @argsUp
        }
        "down" {
            & docker compose @composeFiles down
        }
        "ps" {
            & docker compose @composeFiles ps
        }
        "logs" {
            $args = @("compose") + $composeFiles + @("logs", "--tail=200", "--no-color")
            if ($Services.Count -gt 0) { $args += $Services }
            & docker @args
        }
    }
}
finally {
    Pop-Location
}
