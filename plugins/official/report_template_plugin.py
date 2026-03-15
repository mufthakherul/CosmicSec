from plugins.sdk.base import PluginBase, PluginContext, PluginMetadata, PluginResult


class ReportTemplatePlugin(PluginBase):
    def metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="official-report-template",
            version="1.0.0",
            description="Official custom report template plugin.",
            author="CosmicSec",
            tags=["official", "report", "template"],
            permissions=["report:write"],
            dependencies=[],
        )

    def run(self, context: PluginContext) -> PluginResult:
        template_name = context.options.get("template_name", "default-security-template")
        return PluginResult(
            success=True,
            data={"template_name": template_name, "status": "template-generated"},
        )
