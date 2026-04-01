import { runAgentStream } from './api';

/**
 * Kahn's algorithm — groups nodes into parallel execution levels.
 */
export function topologicalLevels(nodes, edges) {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const adjacency = new Map();
  const inDegree = new Map();

  for (const id of nodeIds) {
    adjacency.set(id, []);
    inDegree.set(id, 0);
  }

  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adjacency.get(edge.source).push(edge.target);
      inDegree.set(edge.target, inDegree.get(edge.target) + 1);
    }
  }

  const levels = [];
  let queue = [...nodeIds].filter((id) => inDegree.get(id) === 0);
  let processed = 0;

  while (queue.length > 0) {
    levels.push([...queue]);
    processed += queue.length;

    const nextQueue = [];
    for (const nodeId of queue) {
      for (const neighbor of adjacency.get(nodeId)) {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
        if (inDegree.get(neighbor) === 0) {
          nextQueue.push(neighbor);
        }
      }
    }
    queue = nextQueue;
  }

  if (processed < nodeIds.size) {
    throw new Error('Workflow contains a cycle. Please remove circular connections.');
  }

  return levels;
}

export function wouldCreateCycle(nodes, edges, newSource, newTarget) {
  const adjacency = new Map();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const edge of edges) {
    if (adjacency.has(edge.source)) {
      adjacency.get(edge.source).push(edge.target);
    }
  }
  adjacency.get(newSource)?.push(newTarget);

  const visited = new Set();
  const stack = [newTarget];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === newSource) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const neighbor of adjacency.get(current) || []) {
      stack.push(neighbor);
    }
  }
  return false;
}

export function getUpstreamOutputs(nodeId, edges, nodeResults, nodes) {
  const upstreamIds = edges
    .filter((e) => e.target === nodeId)
    .map((e) => e.source);

  return upstreamIds
    .filter((id) => nodeResults.has(id))
    .map((id) => {
      const node = nodes.find((n) => n.id === id);
      return {
        label: node?.data?.label || 'Unknown',
        agentName: node?.data?.label || 'Agent',
        content: nodeResults.get(id),
      };
    });
}

export function buildNodePrompt(nodeData, project, upstreamOutputs) {
  let prompt = `# Project: ${project.name || 'Untitled Project'}\n\n`;
  prompt += `## Feature Description\n${project.description}\n\n`;

  if (project.techConstraints) {
    prompt += `## Tech Constraints\n${project.techConstraints}\n\n`;
  }
  if (project.repoPath) {
    prompt += `## Repository Path\n${project.repoPath}\n\n`;
    prompt += `Use this as the base path for all file operations.\n\n`;
  }
  if (project.additionalContext) {
    prompt += `## Additional Context\n${project.additionalContext}\n\n`;
  }

  // Inject intelligent codebase context if available
  if (project.codebaseContext) {
    prompt += `## Existing Codebase Analysis\n\n${project.codebaseContext}\n\n`;
    prompt += `IMPORTANT: Study the codebase context above carefully. Understand the existing architecture, patterns, and conventions BEFORE making any changes. Your code must integrate seamlessly with what already exists.\n\n`;
  }
  if (project.specs?.length > 0) {
    prompt += `## Feature Specifications\n\n`;
    for (const spec of project.specs) {
      if (spec.content?.trim()) {
        prompt += `### ${spec.title || 'Untitled Spec'}\n\n${spec.content}\n\n---\n\n`;
      }
    }
  }

  if (upstreamOutputs.length > 0) {
    prompt += `## Previous Agent Outputs\n\n`;
    for (const prev of upstreamOutputs) {
      prompt += `### ${prev.label} (by ${prev.agentName})\n\n${prev.content}\n\n---\n\n`;
    }
  }

  prompt += `## Your Task\nYou are executing: "${nodeData.label}".\n`;
  if (nodeData.outputFile) {
    prompt += `Save your output as "${nodeData.outputFile}".\n`;
  }

  return prompt;
}

/**
 * Parse QA verdict from agent output.
 * Looks for verdict in multiple formats — flexible matching.
 */
function parseVerdict(output) {
  if (!output) return 'APPROVED';
  const text = output.toUpperCase();

  // Look for explicit VERDICT: line (strictest match first)
  const verdictMatch = text.match(/VERDICT\s*:\s*(APPROVED|ISSUES_FOUND|ARCHITECTURE_ISSUE)/);
  if (verdictMatch) {
    return verdictMatch[1];
  }

  // Look for common verdict patterns anywhere in the text
  // Check for failure indicators
  const hasIssues =
    text.includes('ISSUES_FOUND') ||
    text.includes('ISSUES FOUND') ||
    text.includes('VERDICT: FAIL') ||
    text.includes('**FAIL**') ||
    (text.includes('BUGS FOUND') && !text.includes('NO BUGS FOUND') && !text.includes('0 BUGS FOUND'));

  const hasArchIssue =
    text.includes('ARCHITECTURE_ISSUE') ||
    text.includes('ARCHITECTURE ISSUE') ||
    text.includes('ARCHITECTURAL ISSUE');

  if (hasArchIssue) return 'ARCHITECTURE_ISSUE';
  if (hasIssues) return 'ISSUES_FOUND';

  // Check for pass indicators
  const hasPass =
    text.includes('VERDICT: APPROVED') ||
    text.includes('VERDICT: PASS') ||
    text.includes('**PASS**') ||
    text.includes('ALL TESTS PASS') ||
    text.includes('NO CRITICAL') ||
    text.includes('NO BUGS FOUND');

  if (hasPass) return 'APPROVED';

  // If the QA report mentions specific bugs with severity, treat as issues
  const bugCount = (text.match(/\b(CRITICAL|HIGH|MEDIUM)\s*(BUG|ISSUE|SEVERITY)/g) || []).length;
  if (bugCount > 0) return 'ISSUES_FOUND';

  // Default: if QA agent ran but we can't determine verdict, assume approved
  return 'APPROVED';
}

/**
 * Run a single agent node — streaming single-prompt mode (planning output).
 */
async function runAgentNode(agent, userPrompt, options, callbacks, nodeId) {
  const fullText = await runAgentStream(
    agent.systemPrompt,
    userPrompt,
    (chunk, full) => callbacks.onNodeStream?.(nodeId, chunk, full),
    {
      model: options.model,
      maxTokens: options.maxTokens,
      projectId: options.projectId,
      apiKey: options.apiKey, // For direct Claude API calls in Electron
    }
  );
  return fullText;
}

const MAX_REVIEW_CYCLES = 3;

/**
 * Execute the workflow with agentic mode + reinforcement loop.
 * callbacks: { onNodeStart, onNodeStream, onNodeComplete, onNodeError, onToolCall, onToolResult, onReviewCycle, shouldAbort }
 */
export async function executeWorkflow(workflow, agents, project, options, callbacks) {
  const { nodes, edges } = workflow;
  const levels = topologicalLevels(nodes, edges);
  const nodeResults = new Map();

  for (const level of levels) {
    if (callbacks.shouldAbort?.()) break;

    await Promise.all(
      level.map(async (nodeId) => {
        if (callbacks.shouldAbort?.()) return;

        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;

        // Match agent: by ID (most precise) → by name → by role (fallback)
        const agent = (node.data.agentId && agents.find((a) => a.id === node.data.agentId))
          || agents.find((a) => a.name === node.data.label)
          || agents.find((a) => a.role === node.data.agentRole);
        if (!agent) {
          callbacks.onNodeError?.(nodeId, new Error(`No agent found for: ${node.data.label || node.data.agentRole}`));
          return;
        }

        callbacks.onNodeStart?.(nodeId, agent);

        const upstreamOutputs = getUpstreamOutputs(nodeId, edges, nodeResults, nodes);
        const userPrompt = buildNodePrompt(node.data, project, upstreamOutputs);

        try {
          const fullText = await runAgentNode(agent, userPrompt, options, callbacks, nodeId);
          nodeResults.set(nodeId, fullText);
          await callbacks.onNodeComplete?.(nodeId, fullText, agent, node);

          // ─── Reinforcement Loop ───
          // Check if this is a tester/QA node by role
          if (agent.role === 'tester' || agent.role === 'qa') {
            const verdict = parseVerdict(fullText);
            callbacks.onReviewCycle?.(0, MAX_REVIEW_CYCLES, `verdict: ${verdict}`);

            if (verdict === 'ISSUES_FOUND') {
              // Find the upstream developer node
              const devNodeId = edges
                .filter((e) => e.target === nodeId)
                .map((e) => e.source)
                .find((id) => {
                  const n = nodes.find((n) => n.id === id);
                  const a = agents.find((a) => a.role === n?.data?.agentRole);
                  return a?.role === 'developer';
                });

              if (devNodeId) {
                let reviewCycle = 0;
                let currentVerdict = verdict;
                let qaOutput = fullText;

                while (currentVerdict === 'ISSUES_FOUND' && reviewCycle < MAX_REVIEW_CYCLES) {
                  reviewCycle++;
                  callbacks.onReviewCycle?.(reviewCycle, MAX_REVIEW_CYCLES, 'developer');

                  // Re-run developer with QA feedback
                  const devNode = nodes.find((n) => n.id === devNodeId);
                  const devAgent = agents.find((a) => a.role === devNode?.data?.agentRole);
                  if (!devAgent) break;

                  callbacks.onNodeStart?.(devNodeId, devAgent);

                  const devFixPrompt = buildNodePrompt(devNode.data, project, [
                    ...getUpstreamOutputs(devNodeId, edges, nodeResults, nodes),
                    { label: 'QA Feedback (Fix Required)', agentName: 'QA Engineer', content: qaOutput },
                  ]);

                  const devFixOutput = await runAgentNode(devAgent, devFixPrompt, options, callbacks, devNodeId);
                  nodeResults.set(devNodeId, devFixOutput);
                  await callbacks.onNodeComplete?.(devNodeId, devFixOutput, devAgent, devNode);

                  // Re-run QA
                  callbacks.onReviewCycle?.(reviewCycle, MAX_REVIEW_CYCLES, 'tester');
                  callbacks.onNodeStart?.(nodeId, agent);

                  const qaReviewPrompt = buildNodePrompt(node.data, project, [
                    ...upstreamOutputs.filter((o) => o.label !== node.data.label),
                    { label: `Developer Fix (Cycle ${reviewCycle})`, agentName: devAgent.name, content: devFixOutput },
                  ]);

                  qaOutput = await runAgentNode(agent, qaReviewPrompt, options, callbacks, nodeId);
                  nodeResults.set(nodeId, qaOutput);
                  await callbacks.onNodeComplete?.(nodeId, qaOutput, agent, node);

                  currentVerdict = parseVerdict(qaOutput);
                }
              }
            } else if (verdict === 'ARCHITECTURE_ISSUE') {
              // Find the tech lead node
              const archNodeId = nodes.find((n) => {
                const a = agents.find((a) => a.role === n.data.agentRole);
                return a?.role === 'architect';
              })?.id;

              if (archNodeId) {
                callbacks.onReviewCycle?.(1, 1, 'architect');

                const archNode = nodes.find((n) => n.id === archNodeId);
                const archAgent = agents.find((a) => a.role === archNode?.data?.agentRole);
                if (archAgent) {
                  callbacks.onNodeStart?.(archNodeId, archAgent);

                  const archFixPrompt = buildNodePrompt(archNode.data, project, [
                    { label: 'QA Architecture Issue Report', agentName: 'QA Engineer', content: fullText },
                  ]);

                  const archFixOutput = await runAgentNode(archAgent, archFixPrompt, options, callbacks, archNodeId);
                  nodeResults.set(archNodeId, archFixOutput);
                  await callbacks.onNodeComplete?.(archNodeId, archFixOutput, archAgent, archNode);
                }
              }
            }
          }
        } catch (err) {
          callbacks.onNodeError?.(nodeId, err);
        }
      })
    );
  }

  return nodeResults;
}
