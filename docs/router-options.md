# Router option notes

`withHashLocation()` matches the deployment topology where the server does not rewrite application paths. `withComponentInputBinding()` keeps route parameters declarative at feature boundaries. `withPreloading(PreloadAllModules)` loads lazy feature chunks after startup: it improves later navigation at the cost of background bandwidth and initial device work.
