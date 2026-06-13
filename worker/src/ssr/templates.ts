import baseTemplate from "./templates/base.html";
import errorBodyTemplate from "./templates/error_body.html";
import webuiLoginTemplate from "./templates/webui_login.html";

export const TEMPLATES: Record<string, string> = {
  base: baseTemplate,
  webui_login: webuiLoginTemplate,
  error_body: errorBodyTemplate,
};