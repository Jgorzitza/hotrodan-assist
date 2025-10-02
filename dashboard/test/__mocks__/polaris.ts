import React from "react";
// Render children so text shows up in UI tests
export const Page = (p: any) => React.createElement("div", null, p.children);
export const Card = (p: any) => React.createElement("div", null, p.children);
export const Frame = (p: any) => React.createElement("div", null, p.children);
export const Box = (p: any) => React.createElement("div", null, p.children);
export const Banner = (p: any) => React.createElement("div", null, p.children);
export const Badge = (p: any) => React.createElement("span", null, p.children);
export const Divider = (p: any) => React.createElement("hr");
export const Button = (p: any) => React.createElement("button", null, p.children);
export const Text = (p: any) => React.createElement("span", null, p.children);
export const TextField = (p: any) => React.createElement("input");
export const FormLayout = (p: any) => React.createElement("div", null, p.children);
export const Checkbox = (p: any) => React.createElement("input", { type: "checkbox" });
export const InlineError = (p: any) => React.createElement("div", null, p.message);
export const BlockStack = (p: any) => React.createElement("div", null, p.children);
export const InlineStack = (p: any) => React.createElement("div", null, p.children);
export const Layout: any = Object.assign((p: any) => React.createElement("div", null, p.children), {
  Section: (p: any) => React.createElement("section", null, p.children),
});

const defaultExport: any = {};
export default defaultExport;
