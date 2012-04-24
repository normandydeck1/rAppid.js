define(["require", "js/core/UIComponent", "js/ui/ContentPlaceHolder", "js/core/Module", "underscore", "js/conf/Module"],
    function (require, UIComponent, ContentPlaceHolder, Module, _, ModuleConfiguration) {
        var ModuleLoader = UIComponent.inherit("js.core.ModuleLoader", {
            $behavesAsDomElement: true,
            $classAttributes: [
                'router'
            ],
            ctor: function (attributes) {
                this.callBase();

                this.$modules = {};
            },
            _initializationComplete: function () {
                this.callBase();

                for (var i = 0; i < this.$configurations.length; i++) {
                    var config = this.$configurations[i];

                    if (config instanceof ModuleConfiguration) {
                        this.addModule(config.$);
                    }
                }

            },

            addModule: function (module) {
                _.defaults(module, {
                    name: null,
                    moduleClass: null,
                    route: null,
                    cacheInstance: true
                });

                if (!module.name && !module.route) {
                    throw "module cannot be added: route or at least name is required";
                }

                if (!module.moduleClass) {
                    throw "no moduleClass defined for module";
                }

                if (module.name) {
                    if (this.$modules.hasOwnProperty(module.name)) {
                        throw "module with name '" + module.name + "' already registered"
                    }

                    this.$modules[module.name] = module;
                }

                if (module.route) {
                    if (!this.$.router) {
                        throw "defining modules with routes requires a router instance to be set"
                    }

                    var self = this;
                    this.$.router.addRoute({
                        name: module.name,
                        route: module.route,
                        fn: function (routeContext) {
                            // route triggered

                            // load module
                            if (module.name) {
                                self.loadModuleByName(module.name, routeContext.callback, routeContext);
                            } else {
                                self.loadModule(module.moduleClass, routeContext.callback, routeContext);
                            }

                        }.async()
                    });
                }

            },

            loadModuleByName: function (moduleName, callback, routeContext) {
                if (this.$modules.hasOwnProperty(moduleName)) {

                    var module = this.$modules[moduleName];

                    if (module.cacheInstance && module.moduleInstance) {
                        // TODO: load instance from cache
                    } else {
                        this.loadModule(module.moduleClass, callback, routeContext);
                    }

                } else {
                    throw "Module '" + moduleName + "' not found";
                }
            },

            loadModule: function (moduleFqClassName, callback, routeContext) {

                var eventResult = this.trigger("loadModule", {
                    moduleClass: moduleFqClassName
                });

                var self = this;
                var internalCallback = function (err) {

                    if (err) {
                        self.trigger('moduleLoadError', {
                            moduleClassName: moduleFqClassName
                        });
                    } else {
                        self.trigger('moduleLoaded', {
                            moduleClassName: moduleFqClassName
                        });
                    }

                    if (callback) {
                        callback(err);
                    }
                };

                if (!eventResult.isDefaultPrevented) {
                    // load module

                    require([this.$systemManager.$applicationContext.getFqClassName(moduleFqClassName)], function (moduleBaseClass) {
                        var moduleInstance = new moduleBaseClass(null, false, self.$systemManager, null, null);

                        if (moduleInstance instanceof Module) {

                            moduleInstance._initialize("auto");

                            var contentPlaceHolders = self.getContentPlaceHolders();

                            // set content
                            for (var i = 0; i < contentPlaceHolders.length; i++) {
                                var contentPlaceHolder = contentPlaceHolders[i];
                                contentPlaceHolder.set("content", moduleInstance.findContent(contentPlaceHolder.$.name));
                            }

                            // start module
                            moduleInstance.start(internalCallback, routeContext);

                        } else {
                            internalCallback("Module '" + moduleFqClassName + "' isn't an instance of js.core.Module");
                        }

                    });

                    // TODO cache model instances

                    // Trigger events

                }
            },

            removeChild: function (child) {
                this.callBase();

                var index = this.$modules.indexOf(child);
                if (index != -1) {
                    // TODO: remove route from router

                }
            },

            render: function () {
                // render the ContentPlaceHolder
                return this.callBase();
            }
        });

        ModuleLoader.findContentPlaceHolders = function (component) {
            var ret = [];

            for (var i = 0; i < component.$children.length; i++) {
                var child = component.$children[i];
                if (child instanceof ContentPlaceHolder) {
                    ret.push(child);
                } else {
                    ret.concat(ModuleLoader.findContentPlaceHolders(child));
                }
            }

            return ret;

        };

        return ModuleLoader;
    });