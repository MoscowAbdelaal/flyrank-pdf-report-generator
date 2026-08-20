
## Phase 5: Idempotency

### Test 1: Two identical requests → one file

**Request 1:**
```bash
curl -X POST http://localhost:3000/reports -H "Content-Type: application/json" -d '{}'
Response: 201 Created with ID: abc-123

Request 2 (same day):

bash
curl -X POST http://localhost:3000/reports -H "Content-Type: application/json" -d '{}'
Response: 200 OK with same ID: abc-123

Server Logs:

text
📝 Generating report abc-123...
✅ Report abc-123 generated
🔄 Idempotency: Returning existing report abc-123
Test 2: Force new report

bash
curl -X POST http://localhost:3000/reports -H "Content-Type: application/json" -d '{"force":true}'
Response: 201 Created with new ID: def-456

Result: ✅ Two requests → one file (unless forced)
