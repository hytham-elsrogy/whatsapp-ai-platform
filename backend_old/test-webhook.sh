#!/bin/bash
# WhatsApp Webhook Simulator - يحاكي رسائل واردة من WhatsApp
API="http://localhost:3000/api/v1"

echo "========================================"
echo "  WhatsApp CRM - Webhook Test Suite"
echo "========================================"

# 1. Login
echo ""
echo "🔐 [1/6] Login..."
LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@whatsapp-crm.com","password":"Admin@123456"}')
TOKEN=$(echo "$LOGIN" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  exit 1
fi
echo "✅ Login OK"

# 2. Simulate incoming TEXT message
echo ""
echo "📩 [2/6] Simulating incoming TEXT message from +201012345678..."
curl -s -X POST "$API/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "BUSINESS_ACCOUNT_ID",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "201000000000",
            "phone_number_id": "PHONE_NUMBER_ID"
          },
          "contacts": [{
            "profile": { "name": "أحمد محمد" },
            "wa_id": "201012345678"
          }],
          "messages": [{
            "from": "201012345678",
            "id": "wamid.test_msg_001",
            "timestamp": "'$(date +%s)'",
            "type": "text",
            "text": { "body": "السلام عليكم، محتاج مساعدة في الطلب رقم 5432" }
          }]
        },
        "field": "messages"
      }]
    }]
  }'
echo ""
echo "✅ Text message sent"

sleep 1

# 3. Simulate incoming IMAGE message
echo ""
echo "📸 [3/6] Simulating incoming IMAGE message..."
curl -s -X POST "$API/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "BUSINESS_ACCOUNT_ID",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "201000000000",
            "phone_number_id": "PHONE_NUMBER_ID"
          },
          "contacts": [{
            "profile": { "name": "أحمد محمد" },
            "wa_id": "201012345678"
          }],
          "messages": [{
            "from": "201012345678",
            "id": "wamid.test_msg_002",
            "timestamp": "'$(date +%s)'",
            "type": "image",
            "image": {
              "id": "test_media_id",
              "mime_type": "image/jpeg",
              "sha256": "abc123",
              "caption": "صورة الفاتورة"
            }
          }]
        },
        "field": "messages"
      }]
    }]
  }'
echo ""
echo "✅ Image message sent"

sleep 1

# 4. Simulate second contact
echo ""
echo "📩 [4/6] Simulating message from SECOND contact +201098765432..."
curl -s -X POST "$API/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "BUSINESS_ACCOUNT_ID",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "201000000000",
            "phone_number_id": "PHONE_NUMBER_ID"
          },
          "contacts": [{
            "profile": { "name": "فاطمة علي" },
            "wa_id": "201098765432"
          }],
          "messages": [{
            "from": "201098765432",
            "id": "wamid.test_msg_003",
            "timestamp": "'$(date +%s)'",
            "type": "text",
            "text": { "body": "مرحباً، عايزة أستفسر عن الأسعار" }
          }]
        },
        "field": "messages"
      }]
    }]
  }'
echo ""
echo "✅ Second contact message sent"

sleep 1

# 5. Check results
echo ""
echo "========================================"
echo "  📊 Results"
echo "========================================"

echo ""
echo "👥 Contacts:"
curl -s "$API/contacts" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || \
curl -s "$API/contacts" -H "Authorization: Bearer $TOKEN"

echo ""
echo ""
echo "💬 Conversations:"
curl -s "$API/conversations" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || \
curl -s "$API/conversations" -H "Authorization: Bearer $TOKEN"

echo ""
echo ""
echo "📊 Dashboard:"
curl -s "$API/reports/dashboard?period=month" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || \
curl -s "$API/reports/dashboard?period=month" -H "Authorization: Bearer $TOKEN"

echo ""
echo ""
echo "========================================"
echo "  ✅ Test Complete!"
echo "  📌 Open http://localhost:3001 to see results in UI"
echo "========================================"
