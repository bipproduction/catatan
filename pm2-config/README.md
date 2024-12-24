# PM2 config

```js
module.exports = {
 apps: [
   {
     name: "hipmi-3037",
     script: "bun",
     args: "--bun next start -p 3037",
     cwd: "/root/projects/hipmi",
     env: {
       NODE_ENV: "production"
     },
     exec_mode: "fork",
     max_memory_restart: "3G",
     autorestart: true,
     error_file: "/root/logs/hipmi_error.log",
     out_file: "/root/logs/hipmi_out.log",
     merge_logs: true
   },
   {
     name: "hipmi-3038", 
     script: "bun",
     args: "--bun next start -p 3038",
     cwd: "/root/projects/hipmi",
     env: {
       NODE_ENV: "production"
     },
     exec_mode: "fork",
     max_memory_restart: "3G",
     autorestart: true,
     error_file: "/root/logs/hipmi_error.log",
     out_file: "/root/logs/hipmi_out.log",
     merge_logs: true
   },
   {
     name: "hipmi-3039",
     script: "bun",
     args: "--bun next start -p 3039",
     cwd: "/root/projects/hipmi",
     env: {
       NODE_ENV: "production"
     },
     exec_mode: "fork",
     max_memory_restart: "3G",
     autorestart: true,
     error_file: "/root/logs/hipmi_error.log", 
     out_file: "/root/logs/hipmi_out.log",
     merge_logs: true
   },
   {
     name: "hipmi-3040",
     script: "bun",
     args: "--bun next start -p 3040",
     cwd: "/root/projects/hipmi",
     env: {
       NODE_ENV: "production"
     },
     exec_mode: "fork",
     max_memory_restart: "3G",
     autorestart: true,
     error_file: "/root/logs/hipmi_error.log",
     out_file: "/root/logs/hipmi_out.log",
     merge_logs: true
   }
 ]
}
```
