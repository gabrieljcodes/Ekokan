package docs

import (
	_ "embed"
	"net/http"
)

//go:embed openapi.json
var OpenAPIJSON []byte

const scalarHTML = `<!doctype html>
<html>
  <head>
    <title>Ekokan API Reference & Documentation</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0d0d12;
        color: #fff;
      }
    </style>
  </head>
  <body>
    <script id="api-reference" data-url="/api/docs/openapi.json" data-theme="purple" data-layout="modern"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`

func ServeOpenAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(OpenAPIJSON)
}

func ServeScalar(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(scalarHTML))
}
