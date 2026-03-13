/**
 * evermemos.js — EverMemOS API client
 */

import https from "node:https";

const API_BASE = "https://api.evermind.ai/api/v0";

/**
 * POST /memories — Add a single memory message
 */
export async function addMemory(payload, apiKey) {
  const res = await fetch(`${API_BASE}/memories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.json();
}

/**
 * GET /memories/search — Search memories (uses GET with body)
 */
export function searchMemories(query, options = {}, apiKey) {
  const {
    userId = "evermem-user",
    method = "hybrid",
    topK = 10,
    types,
    groupIds,
  } = options;

  const body = {
    user_id: userId,
    query,
    retrieve_method: method,
    top_k: topK,
  };

  if (types) body.memory_types = types;
  if (groupIds) body.group_ids = groupIds;

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(`${API_BASE}/memories/search`);

    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => (responseBody += chunk));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`API error ${res.statusCode}: ${responseBody}`));
          } else {
            try {
              resolve(JSON.parse(responseBody));
            } catch {
              reject(new Error(`Invalid JSON: ${responseBody.slice(0, 200)}`));
            }
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

/**
 * Send a batch of extracted messages to EverMemOS.
 * entries: [{role, text, timestamp}]
 */
export async function sendMessages(entries, { groupId, groupName, userId, agentName, apiKey, dryRun = false, onProgress }) {
  let sent = 0;
  let errors = 0;
  const errorList = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const msgId = `msg_${groupId}_${String(i).padStart(4, "0")}`;
    const createTime = entry.timestamp
      ? new Date(entry.timestamp).toISOString()
      : new Date().toISOString();

    const assistantName = agentName ? `${agentName}-assistant` : "assistant";

    const payload = {
      message_id: msgId,
      create_time: createTime,
      sender: entry.role === "user" ? userId : assistantName,
      sender_name: entry.role === "user" ? "User" : (agentName ?? "Assistant"),
      content: entry.text,
      group_id: groupId,
      group_name: groupName,
      role: entry.role,
    };

    if (dryRun) {
      console.log(JSON.stringify({ dry_run: true, ...payload }));
      sent++;
      continue;
    }

    try {
      await addMemory(payload, apiKey);
      sent++;
      if (onProgress) onProgress(sent, entries.length);
    } catch (err) {
      errors++;
      errorList.push({ index: i, message: err.message });
    }
  }

  return { sent, errors, errorList };
}
