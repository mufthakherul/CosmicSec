from plugins.sdk.base import PluginBase, PluginContext, PluginMetadata, PluginResult


class JiraIntegrationPlugin(PluginBase):
    def metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="official-jira",
            version="1.0.0",
            description="Official JIRA integration plugin for issue creation workflows.",
            author="CosmicSec",
            tags=["official", "jira", "ticketing"],
            permissions=["integration:write"],
            dependencies=[],
        )

    def run(self, context: PluginContext) -> PluginResult:
        return PluginResult(
            success=True,
            data={"status": "ticket-submitted", "project": context.options.get("project", "SEC")},
        )
