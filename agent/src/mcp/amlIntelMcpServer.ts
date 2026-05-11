import { LuaMCPServer, env } from 'lua-cli'

const resolveMcpUrl = () => env('AML_INTEL_MCP_URL') || 'https://mcp.example.com/aml'

const resolveMcpHeaders = () => {
  const token = env('AML_INTEL_MCP_TOKEN')
  if (!token) {
    return {}
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

export const amlIntelMcpServer = new LuaMCPServer({
  name: 'aml-intel-remote',
  transport: 'streamable-http',
  timeout: 15000,
  url: resolveMcpUrl,
  headers: resolveMcpHeaders,
})

export default amlIntelMcpServer
