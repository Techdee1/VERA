import { LuaSkill } from 'lua-cli'

import { PingTool } from './tools/PingTool.js'

export const pingSkill = new LuaSkill({
  name: 'ping-skill',
  description: 'Minimal diagnostic skill to verify Lua tool discovery and execution.',
  context: 'Use ping_tool to validate that tool execution and JSON input handling are working.',
  tools: [new PingTool()],
})

export default pingSkill
