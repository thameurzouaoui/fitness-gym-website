$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Base = 'http://localhost:3000/api'
$script:pass = 0; $script:fail = 0
function Assert($name, $cond) {
  if ($cond) { $script:pass++; Write-Host "PASS - $name" }
  else { $script:fail++; Write-Host "FAIL - $name" }
}
function Code($resp) { [int]$resp.StatusCode }

# T1: public products list
$r = Invoke-RestMethod "$Base/products" -TimeoutSec 30
Assert "GET /products ok=true" ($r.ok -and $null -ne $r.products)

# T2: login wrong password -> 401
try { Invoke-WebRequest "$Base/auth/login" -Method Post -ContentType 'application/json' -Body '{"username":"admin","password":"WRONG"}' -UseBasicParsing | Out-Null; $s = 200 } catch { $s = [int]$_.Exception.Response.StatusCode }
Assert "login wrong password -> 401 ($s)" ($s -eq 401)

# T3: login good -> token + cookie Max-Age fix (28800 s, not ~29 s)
$wr = Invoke-WebRequest "$Base/auth/login" -Method Post -ContentType 'application/json' -Body '{"username":"admin","password":"admin123"}' -UseBasicParsing -SessionVariable sess
$login = $wr.Content | ConvertFrom-Json
$Tok = $login.token
Assert "login admin/admin123 -> ok + name" ($login.ok -and $login.name -eq 'Master Admin')
$setCookie = [string]$wr.Headers['Set-Cookie']
Assert "cookie Max-Age=28800 (ms-bug fixed)" ($setCookie -match 'Max-Age=28800')
$H = @{ Authorization = "Bearer $Tok" }

# T4/T5: /auth/me with + without token
$me = Invoke-RestMethod "$Base/auth/me" -Headers $H -TimeoutSec 30
Assert "/auth/me returns admin" ($me.user.username -eq 'admin')
$me2 = Invoke-RestMethod "$Base/auth/me" -TimeoutSec 30
Assert "/auth/me without token -> user null" ($null -eq $me2.user)

# T6: create order (2 x 49.90 = 99.80)
$body = '{"customer_name":"Test Client","email":"t@t.tn","phone":"21600000","address":"Rue 1","city":"Tunis","items":[{"name":"Test Glove","price":49.9,"qty":2}]}'
$o = Invoke-RestMethod "$Base/orders" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 30
Assert "POST /orders -> ref issued" ($o.ok -and $o.ref -like 'CMD-*')

# T7: invalid order -> 400
try { Invoke-WebRequest "$Base/orders" -Method Post -ContentType 'application/json' -Body '{"customer_name":"x"}' -UseBasicParsing | Out-Null; $s=200 } catch { $s = [int]$_.Exception.Response.StatusCode }
Assert "invalid order -> 400 ($s)" ($s -eq 400)

# T8: stats unauth -> 401
try { Invoke-WebRequest "$Base/admin/stats" -UseBasicParsing | Out-Null; $s=200 } catch { $s = [int]$_.Exception.Response.StatusCode }
Assert "stats without token -> 401 ($s)" ($s -eq 401)

# T9: admin orders list has items joined
$ao = Invoke-RestMethod "$Base/admin/orders" -Headers $H -TimeoutSec 30
$newest = $ao.orders[0]
Assert "admin orders newest has items[]" ($newest.items.Count -eq 1 -and $newest.items[0].product_name -eq 'Test Glove')
$OrderId = $newest.id

# T10: status patch valid + invalid
$st = Invoke-RestMethod "$Base/admin/orders/$OrderId/status" -Method Patch -ContentType 'application/json' -Headers $H -Body '{"status":"paid"}' -TimeoutSec 30
Assert "PATCH order status paid" $st.ok
try { Invoke-WebRequest "$Base/admin/orders/$OrderId/status" -Method Patch -ContentType 'application/json' -Headers $H -Body '{"status":"zzz"}' -UseBasicParsing | Out-Null; $s=200 } catch { $s = [int]$_.Exception.Response.StatusCode }
Assert "PATCH invalid status -> 400 ($s)" ($s -eq 400)

# T11: revenue counts paid orders only
$stats = Invoke-RestMethod "$Base/admin/stats" -Headers $H -TimeoutSec 30
Assert "stats revenue = 99.8 after paid" ([double]$stats.stats.revenue -eq 99.8)
Assert "stats numeric types" ($stats.stats.orders -is [int] -or $stats.stats.orders -is [long])

# T12: product create (JSON)
$p = Invoke-RestMethod "$Base/admin/products" -Method Post -ContentType 'application/json' -Headers $H -Body '{"name":"Prod Test A","price":"29.90","category":"boxing","description":"d","badge":""}' -TimeoutSec 30
Assert "POST product JSON" ($p.ok -and [long]$p.id -gt 0)
$Pid1 = $p.id

# T13: product update + verify in public list
$u = Invoke-RestMethod "$Base/admin/products/$Pid1" -Method Put -ContentType 'application/json' -Headers $H -Body '{"name":"Prod Test B","price":"39.90","category":"boxing","keep_image":"1"}' -TimeoutSec 30
$pl = Invoke-RestMethod "$Base/products" -TimeoutSec 30
$found = $pl.products | Where-Object { $_.id.ToString() -eq "$Pid1" }
Assert "PUT product updated" ($u.ok -and $found.name -eq 'Prod Test B' -and [double]$found.price -eq 39.9)

# T14: product create via multipart FormData (fields only, no file)
Add-Type -AssemblyName System.Net.Http
$mp = New-Object System.Net.Http.MultipartFormDataContent
foreach ($kv in @(@('name','Prod Multipart'),@('price','19.50'),@('category','general'),@('description','mp'),@('badge','NEW'))) {
  $mp.Add([System.Net.Http.StringContent]::new($kv[1]), $kv[0])
}
$client = New-Object System.Net.Http.HttpClient
$client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $Tok)
$mResp = $client.PostAsync("$Base/admin/products", $mp).Result
$mJson = $mResp.Content.ReadAsStringAsync().Result | ConvertFrom-Json
Assert "POST product multipart fields" ($mResp.IsSuccessStatusCode -and $mJson.ok -and [long]$mJson.id -gt 0)
$Pid2 = $mJson.id

# T15: cleanup products
$d1 = Invoke-RestMethod "$Base/admin/products/$Pid1" -Method Delete -Headers $H -TimeoutSec 30
$d2 = Invoke-RestMethod "$Base/admin/products/$Pid2" -Method Delete -Headers $H -TimeoutSec 30
Assert "DELETE products" ($d1.ok -and $d2.ok)

# T16: contacts flow
$c = Invoke-RestMethod "$Base/contacts" -Method Post -ContentType 'application/json' -Body '{"name":"Contact Test","email":"c@t.tn","phone":"111","subject":"S","message":"Hello msg"}' -TimeoutSec 30
Assert "POST contact public" $c.ok
$cl = Invoke-RestMethod "$Base/admin/contacts" -Headers $H -TimeoutSec 30
$cRow = $cl.contacts[0]
Assert "contact listed unread" (-not $cRow.is_read)
$rd = Invoke-RestMethod "$Base/admin/contacts/$($cRow.id)/read" -Method Patch -ContentType 'application/json' -Headers $H -Body '{"is_read":true}' -TimeoutSec 30
$cl2 = Invoke-RestMethod "$Base/admin/contacts" -Headers $H -TimeoutSec 30
Assert "PATCH read toggles is_read" (($cl2.contacts | Where-Object { $_.id -eq $cRow.id }).is_read -eq $true)
$cdel = Invoke-RestMethod "$Base/admin/contacts/$($cRow.id)" -Method Delete -Headers $H -TimeoutSec 30
Assert "DELETE contact" $cdel.ok

# T17: members flow
$m = Invoke-RestMethod "$Base/members" -Method Post -ContentType 'application/json' -Body '{"name":"Member Test","phone":"222","plan":"Mensuel","price":"80 DT"}' -TimeoutSec 30
Assert "POST member public" $m.ok
$ml = Invoke-RestMethod "$Base/admin/members" -Headers $H -TimeoutSec 30
$mRow = $ml.members[0]
Assert "member listed with plan" ($mRow.plan -eq 'Mensuel')
$mdel = Invoke-RestMethod "$Base/admin/members/$($mRow.id)" -Method Delete -Headers $H -TimeoutSec 30
Assert "DELETE member" $mdel.ok

# T18: delete test order
$od = Invoke-RestMethod "$Base/admin/orders/$OrderId" -Method Delete -Headers $H -TimeoutSec 30
Assert "DELETE order cascade" $od.ok

# T19: CORS preflight from allowed origin
$pf = Invoke-WebRequest "$Base/auth/login" -Method Options -Headers @{Origin='http://localhost:5173'; 'Access-Control-Request-Method'='POST'} -UseBasicParsing
$acao = [string]$pf.Headers['Access-Control-Allow-Origin']
Assert "CORS preflight 204 + echo origin ($acao)" ((Code $pf) -eq 204 -and $acao -eq 'http://localhost:5173')

# T20: unknown api route -> 404 json
$r404 = $client.GetAsync("$Base/nope").Result
$t404 = $r404.Content.ReadAsStringAsync().Result
Assert "unknown route 404 API inconnue" (([int]$r404.StatusCode) -eq 404 -and $t404 -like '*API inconnue*')

# T21: product create via multipart WITH real PNG file (must get past format gate; blob auth error expected locally)
Add-Type -AssemblyName System.Net.Http
$png = [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
$mp2 = New-Object System.Net.Http.MultipartFormDataContent
foreach ($kv in @(@('name','Prod Img'),@('price','12.00'),@('category','general'))) { $mp2.Add([System.Net.Http.StringContent]::new($kv[1]), $kv[0]) }
$pngContent = New-Object System.Net.Http.ByteArrayContent -ArgumentList (,$png)
$mp2.Add($pngContent, 'image', 'photo.png')
$r21 = $client.PostAsync("$Base/admin/products", $mp2).Result
$b21 = $r21.Content.ReadAsStringAsync().Result
Assert "multipart PNG passes format gate (no 'Format non supporté')" (-not $b21.Contains('Format non supporté'))
if ($b21 -match '"id":(\d+)') { Invoke-RestMethod "$Base/admin/products/$($Matches[1])" -Method Delete -Headers $H | Out-Null }

# T22: multipart with .txt file must be rejected with format error
$mp3 = New-Object System.Net.Http.MultipartFormDataContent
$mp3.Add([System.Net.Http.StringContent]::new('X'), 'name')
$mp3.Add([System.Net.Http.StringContent]::new('5'), 'price')
$mp3.Add([System.Net.Http.StringContent]::new('hello'), 'image', 'notes.txt')
$r22 = $client.PostAsync("$Base/admin/products", $mp3).Result
$b22 = $r22.Content.ReadAsStringAsync().Result
Assert "multipart txt rejected as unsupported" ($b22 -match 'non support')

# T23: security headers (helmet) on API responses
$r23 = $client.GetAsync("$Base/products").Result
$h23 = $r23.Headers
$nosniff = $h23.Contains('X-Content-Type-Options') -and $h23.GetValues('X-Content-Type-Options')[0] -eq 'nosniff'
$xfo = $h23.Contains('X-Frame-Options')
$hsts = $h23.Contains('Strict-Transport-Security')
Assert "security headers nosniff+frameguard+hsts" ($nosniff -and $xfo -and $hsts)

# T24: successful logins do NOT consume the failure budget (skipSuccessfulRequests)
$ok24 = $null
for ($i = 1; $i -le 10; $i++) {
  $ok24 = Invoke-RestMethod "$Base/auth/login" -Method Post -ContentType 'application/json' -Body '{"username":"admin","password":"admin123"}' -TimeoutSec 30
}
Assert "10 good logins all pass" ($ok24.ok -eq $true)
try {
  Invoke-RestMethod "$Base/auth/login" -Method Post -ContentType 'application/json' -Body '{"username":"admin","password":"definitely-wrong"}' -TimeoutSec 30 | Out-Null
  $s24 = 200
} catch { $s24 = [int]$_.Exception.Response.StatusCode }
Assert "bad login among good ones -> 401 not 429" ($s24 -eq 401)

# T25: brute-force blocked with 429 once 10 failures accumulate in the window
$lastStatus = 0; $lastBody = ''
for ($i = 1; $i -le 12; $i++) {
  $br = $client.PostAsync("$Base/auth/login", [System.Net.Http.StringContent]::new('{"username":"admin","password":"definitely-wrong"}', [System.Text.Encoding]::UTF8, 'application/json')).Result
  $lastStatus = [int]$br.StatusCode
  $lastBody = $br.Content.ReadAsStringAsync().Result
  if ($lastStatus -eq 429) { break }
}
Assert "login brute-force blocked with 429 + message" ($lastStatus -eq 429 -and $lastBody.Contains('Trop de tentatives'))

Write-Host ""
Write-Host "RESULT: $pass passed, $fail failed"
if ($script:fail -gt 0) { exit 1 }
