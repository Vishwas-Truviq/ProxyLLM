import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/recommend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const query = body.query;
          if (!query || !query.trim()) {
            return new Response(JSON.stringify({ error: "Query required", results: [] }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const cohereKey = process.env.COHERE_API_KEY;
          const pineconeKey = process.env.PINECONE_API_KEY;
          const pineconeHost = "amicorp-kb-ot25xdb.svc.aped-4627-b74a.pinecone.io";

          if (!cohereKey || !pineconeKey) {
            console.error("Missing API Keys on Frontend Server:", { hasCohere: !!cohereKey, hasPinecone: !!pineconeKey });
            return new Response(JSON.stringify({ error: "Server configuration error", results: [], noMatch: true }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          // 1. Get embedding from Cohere
          const embedRes = await fetch("https://api.cohere.com/v1/embed", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cohereKey}`,
            },
            body: JSON.stringify({
              texts: [query.slice(0, 512)],
              model: "embed-english-light-v3.0",
              input_type: "search_query",
              truncate: "END",
            }),
          });

          if (!embedRes.ok) {
            const errText = await embedRes.text();
            throw new Error(`Cohere embedding failed: ${embedRes.status} ${errText}`);
          }

          const embedData = await embedRes.json();
          const queryVector = embedData.embeddings[0];

          // 2. Query Pinecone
          const pcRes = await fetch(`https://${pineconeHost}/query`, {
            method: "POST",
            headers: {
              "Api-Key": pineconeKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              vector: queryVector,
              topK: 10,
              includeMetadata: true,
            }),
          });

          if (!pcRes.ok) {
            const errText = await pcRes.text();
            throw new Error(`Pinecone query failed: ${pcRes.status} ${errText}`);
          }

          const pcData = await pcRes.json();
          const matches = pcData.matches || [];

          // 3. Filter matches (type == "entity", score > 0.45, deduped by entity)
          const seen = new Set<string>();
          const filteredMatches = [];
          for (const m of matches) {
            const score = m.score || 0;
            const metadata = m.metadata || {};
            const entityName = metadata.entity;

            if (metadata.type === "entity" && entityName && score > 0.45) {
              if (!seen.has(entityName)) {
                seen.add(entityName);
                filteredMatches.push(m);
                if (filteredMatches.length === 3) {
                  break;
                }
              }
            }
          }

          if (filteredMatches.length === 0) {
            return new Response(JSON.stringify({ results: [], noMatch: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // 4. Map results to expected Recommendation schema
          const results = filteredMatches.map((m, idx) => {
            const md = m.metadata || {};
            const score = m.score || 0;

            const categories = [
              md.entityCategory,
              md.serviceType,
              md.keyFeature1,
              md.keyFeature2,
            ].filter(Boolean).filter((v) => v !== "—").slice(0, 3);

            const feeFields = [
              md.setupFee,
              md.corporateDirectorFee,
              md.registeredOfficeFee,
              md.corporateSecretaryFee,
              md.governmentFee,
            ].filter((f) => f && f !== "—");

            const idealFor = [md.idealFor1, md.idealFor2].filter(Boolean);

            return {
              id: idx + 1,
              score: Math.round(score * 100),
              jurisdiction: md.country || "Unknown",
              entityName: md.entity || "Unnamed Entity",
              categories,
              idealFor,
              setupCost: md.setupFee || "Contact Amicorp",
              annualCost: md.annualFeeTotal || "Contact Amicorp",
              desc: md.description || "",
              setupTime: md.setupTime || "",
              benefit1: md.benefit1 || "",
              benefit2: md.benefit2 || "",
              benefit3: md.benefit3 || "",
              legalFramework: md.legalFramework || "",
              liabilityProtection: md.liabilityProtection || "",
              publicRegister: md.publicRegister || "",
              fees: {
                setupFee: md.setupFee || "—",
                corporateDirectorFee: md.corporateDirectorFee || "—",
                registeredOfficeFee: md.registeredOfficeFee || "—",
                corporateSecretaryFee: md.corporateSecretaryFee || "—",
                governmentFee: md.governmentFee || "—",
                annualFeeTotal: md.annualFeeTotal || "—",
                hourlyRates: md.hourlyRates || "—",
              },
            };
          });

          return new Response(JSON.stringify({ results, noMatch: false }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("Recommend handler error:", err);
          return new Response(
            JSON.stringify({ error: (err as Error).message, results: [], noMatch: true }),
            {
              status: 502,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
