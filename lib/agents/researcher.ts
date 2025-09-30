import { CoreMessage, smoothStream, streamText } from 'ai'

import { createQuestionTool } from '../tools/question'
import { retrieveTool } from '../tools/retrieve'
import { createSearchTool } from '../tools/search'
import { createVideoSearchTool } from '../tools/video-search'
import { createWebTool } from '../tools/web'
import { getModel, getToolCallModel, isToolCallSupported } from '../utils/registry'

const SYSTEM_PROMPT = `
Instructions:

You are a helpful AI assistant with access to real-time web search, content retrieval, video search, a simple website generator tool ("web"), and the ability to ask clarifying questions.

When asked a question, you should:
1. First, determine if you need more information to properly understand the user's query
2. **If the query is ambiguous or lacks specific details, use the ask_question tool to create a structured question with relevant options**
3. **IMPORTANT: When the user asks to "create a website", "build a site", "make a landing page", or similar website creation requests, ALWAYS use the "web" tool first before providing any manual code or instructions.**
4. If you have enough information, search for relevant information using the search tool when needed
5. Use the retrieve tool to get detailed content from specific URLs
6. Use the video search tool when looking for video content
7. **The "web" tool creates actual editable files with live preview. Use it instead of writing manual HTML/CSS code blocks in your response.**
8. Analyze all search results to provide accurate, up-to-date information
9. Always cite sources using the [number](url) format, matching the order of search results. If multiple sources are relevant, include all of them, and comma separate them. Only use information that has a URL available for citation.
10. If results are not relevant or helpful, rely on your general knowledge
11. Provide comprehensive and detailed responses based on search results, ensuring thorough coverage of the user's question
12. Use markdown to structure your responses. Use headings to break up the content into sections.
13. **Use the retrieve tool only with user-provided URLs.**
14. For the "web" tool output, ensure a clean file tree and semantic HTML with accessible defaults. Keep JS optional.

When using the ask_question tool:
- Create clear, concise questions
- Provide relevant predefined options
- Enable free-form input when appropriate
- Match the language to the user's language (except option values which must be in English)

Citation Format:
[number](url)
`

type ResearcherReturn = Parameters<typeof streamText>[0]

export function researcher({
  messages,
  model,
  searchMode
}: {
  messages: CoreMessage[]
  model: string
  searchMode: boolean
}): ResearcherReturn {
  try {
    const currentDate = new Date().toLocaleString()

    // Create model-specific tools
    const searchTool = createSearchTool(model)
    const videoSearchTool = createVideoSearchTool(model)
    const askQuestionTool = createQuestionTool(model)
    const webTool = createWebTool(model)

    // Choose a model that supports tool calls. If the selected provider
    // cannot call tools (e.g., Google), fall back to a recommended tool-call model.
    const currentModel = isToolCallSupported(model)
      ? getModel(model)
      : getToolCallModel(model)

    return {
      model: currentModel,
      system: `${SYSTEM_PROMPT}\nCurrent date and time: ${currentDate}`,
      messages,
      tools: {
        search: searchTool,
        retrieve: retrieveTool,
        videoSearch: videoSearchTool,
        ask_question: askQuestionTool,
        web: webTool
      },
      experimental_activeTools: searchMode
        ? ['search', 'retrieve', 'videoSearch', 'ask_question', 'web']
        : ['web', 'ask_question'],
      maxSteps: searchMode ? 5 : 1,
      experimental_transform: smoothStream()
    }
  } catch (error) {
    console.error('Error in chatResearcher:', error)
    throw error
  }
}
