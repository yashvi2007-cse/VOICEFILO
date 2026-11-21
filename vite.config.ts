import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const geminiApiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

  return {
    plugins: [
      react(),
      {
        name: 'gemini-intent-proxy',
        configureServer(server) {
          server.middlewares.use('/api/parse-intent', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });

            req.on('end', async () => {
              try {
                const parsedBody = JSON.parse(body || '{}');
                const transcript = parsedBody.transcript || '';
                const customerList = parsedBody.customerNames || [];

                if (!transcript) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Transcript is required' }));
                  return;
                }

                if (!geminiApiKey) {
                  // If no Gemini key, return status so frontend falls back to deterministic engine
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    useDeterministicFallback: true,
                    message: 'GEMINI_API_KEY not configured on server. Use deterministic parser.'
                  }));
                  return;
                }

                // Call Gemini API server-side
                const prompt = `You are the AI engine for VOICEFILO, a voice khata ledger for Indian kirana shopkeepers.
Extract structured transaction information from the shopkeeper's voice transcript.
Language can be Hindi, Hinglish, English, or Indian code-mixed speech.

Known customers list: ${JSON.stringify(customerList)}

Voice Transcript: "${transcript}"

Current Date: "${new Date().toISOString().split('T')[0]}"

Return ONLY a valid JSON object strictly matching this schema:
{
  "intent": "ADD_CREDIT" | "RECORD_PAYMENT" | "CHECK_BALANCE" | "DAILY_SUMMARY" | "CUSTOMER_HISTORY" | "CORRECT_TRANSACTION" | "UNKNOWN",
  "customer_name": string or null,
  "amount": number or null,
  "transaction_direction": "CREDIT" | "PAYMENT" | "NONE",
  "transaction_date": "YYYY-MM-DD" or null,
  "relative_date": "today" | "yesterday" | "day_before_yesterday" | null,
  "confidence": number between 0.0 and 1.0,
  "needs_clarification": boolean,
  "clarification_reason": string or null,
  "correction_amount": number or null,
  "raw_transcript": "${transcript.replace(/"/g, '\\"')}",
  "response_text": "A brief natural Hinglish spoken confirmation / answer to the shopkeeper"
}

Important Rules:
- "udhaar", "baki", "khate mein jodo", "diye hain udhaar", "le gaya" indicate ADD_CREDIT (customer owes shopkeeper).
- "de diye", "jama kiye", "payment aaya", "chuka diye", "wapas kiye" indicate RECORD_PAYMENT (customer paid shopkeeper).
- "kitna baaki hai", "total kitna hai", "hisaab batao" indicate CHECK_BALANCE.
- "aaj kitna udhaar gaya", "aaj kitna collection hua" indicate DAILY_SUMMARY.
- "Nahi, 430" or "Actually 450" or "Change it to 430" indicate CORRECT_TRANSACTION.
- Number expressions like "teen sau chaalis" = 340, "chaar sau tees" = 430, "do hazaar" = 2000, "barah sau pachaas" = 1250.
- Match customer names intelligently against the known customers list if available.
- Always be helpful, respectful, and brief.
`;

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
                const response = await fetch(geminiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                      response_mime_type: 'application/json',
                      temperature: 0.1
                    }
                  })
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  console.error('Gemini API Error:', errorText);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ useDeterministicFallback: true, error: 'Gemini API call failed' }));
                  return;
                }

                const data = await response.json();
                const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!contentText) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ useDeterministicFallback: true }));
                  return;
                }

                const parsed = JSON.parse(contentText);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(parsed));
              } catch (err) {
                console.error('Intent proxy error:', err);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ useDeterministicFallback: true, error: String(err) }));
              }
            });
          });
        }
      }
    ]
  };
});
