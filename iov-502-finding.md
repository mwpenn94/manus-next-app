# IOV Finding: 502 Errors from Sandbox Session Disconnect

The "Unexpected token '<', \"<!doctype \"... is not valid JSON" errors in the browser console
are caused by 502 responses from the sandbox proxy (x-e2b-error-code: SESSION_CONNECT_FAILED).

This happens when:
1. The sandbox session hibernated between test sessions
2. The proxy returns an HTML error page instead of JSON
3. tRPC client tries to parse the HTML as JSON → error

This is NOT an app bug — it's a sandbox infrastructure issue that occurs during session transitions.
The production deployment at manusnext-mlromfub.manus.space would not have this issue since it runs on CloudRun.

**Verdict: NOT A BUG — infrastructure artifact of dev environment**
