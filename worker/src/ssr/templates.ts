import accountsTemplate from "./templates/accounts.html";
import baseTemplate from "./templates/base.html";
import dashboardTemplate from "./templates/dashboard.html";
import errorBodyTemplate from "./templates/error_body.html";
import loginTemplate from "./templates/login.html";
import webuiLoginTemplate from "./templates/webui_login.html";

export const TEMPLATES: Record<string, string> = {
  base: baseTemplate,
  webui_login: webuiLoginTemplate,
  error_body: errorBodyTemplate,
  login: loginTemplate,
  dashboard: dashboardTemplate,
  accounts: accountsTemplate,
};