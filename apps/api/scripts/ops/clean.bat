@echo off
echo Cleaning all products...
echo.

curl -X DELETE "http://localhost:4100/products/1f8e8f4b-2079-456d-8bf5-3ee3c35ab795"
curl -X DELETE "http://localhost:4100/products/630c0548-5fc0-48fe-9283-9526782e5089"
curl -X DELETE "http://localhost:4100/products/0e3ff38b-f577-4dcf-90a0-4c454c71f6de"
curl -X DELETE "http://localhost:4100/products/82731d34-e1ba-40c1-9b82-725ebbd6b6e2"
curl -X DELETE "http://localhost:4100/products/f34a306a-92f0-421c-8d13-272cd0223c33"
curl -X DELETE "http://localhost:4100/products/e2fe5641-e3d2-4c9a-bded-2574d9e0e037"
curl -X DELETE "http://localhost:4100/products/1c74ca96-5487-48b6-b5c5-6bb8b7f987d6"
curl -X DELETE "http://localhost:4100/products/c422816b-2cb7-4f40-90e8-ddac0a9e25a4"
curl -X DELETE "http://localhost:4100/products/4acebd14-4e0c-4e3a-b5c6-120364b0c781"
curl -X DELETE "http://localhost:4100/products/4dc30565-f267-419f-881b-fa40703ac786"
curl -X DELETE "http://localhost:4100/products/281b8c83-a4dd-4795-815f-378171f6bc14"
curl -X DELETE "http://localhost:4100/products/4d8aaa36-82ce-4cf2-a7f9-c8279dc3b202"
curl -X DELETE "http://localhost:4100/products/9f692163-f51f-4ec5-a73f-bec771125878"
curl -X DELETE "http://localhost:4100/products/f044c487-5cb5-497d-ad09-00ff8c1bc626"
curl -X DELETE "http://localhost:4100/products/71f695c2-252c-4d32-87fc-0c3fd468484e"
curl -X DELETE "http://localhost:4100/products/69005e12-903b-4df2-92ac-19aa5de9aadf"

echo.
echo Done! All products deleted.
echo.
curl -s "http://localhost:4100/products?limit=1" | findstr /C:"\"data\":[]"
if %errorlevel%==0 (
    echo SUCCESS: Database is clean!
) else (
    echo Verifying...
    curl -s "http://localhost:4100/products?limit=1"
)
