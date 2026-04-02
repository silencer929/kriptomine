# test-users.ps1
$uri = "http://localhost:3000/api/admin/users"
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImNtcGFkbWluMSIsImlzX2FkbWluIjp0cnVlLCJpYXQiOjE3NTU1OTY1OTgsImV4cCI6MTc1NTY4Mjk5OH0.VtennF65-ARz2b19b__Iinfo6L1uNJLOEf1icVro9yk"
try {
    $response = Invoke-WebRequest -Uri $uri -Method Get -Headers @{ "Authorization" = "Bearer $token" } -UseBasicParsing
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Status Description: $($response.StatusDescription)"
    Write-Host "Response Body: $($response.Content)"
}
catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Error Status Code: $($_.Exception.Response.StatusCode)"
        Write-Host "Error Details: $($_.ErrorDetails.Message)"
    }
}