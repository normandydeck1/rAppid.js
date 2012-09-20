define(['require', 'js/core/Bindable', 'js/core/List', 'js/data/TypeResolver', 'moment'],
    function (require, Bindable, List, TypeResolver, moment) {
        var Collection;

        var Entity = Bindable.inherit('js.core.Entity', {

            ctor: function (attributes) {
                this.$errors = new Bindable();
                this._extendSchema();

                this.callBase(attributes);
            },

            $schema: {},

            $context: null,

            $dependentObjectContext: null,

            $isDependentObject: true,

            _extendSchema: function () {
                var base = this.base;

                while (base instanceof Entity) {
                    var baseSchema = base.$schema;
                    for (var type in baseSchema) {
                        if (baseSchema.hasOwnProperty(type) && !this.$schema.hasOwnProperty(type)) {
                            this.$schema[type] = baseSchema[type];
                        }
                    }
                    base = base.base;
                }
            },

            getContextForChild: function (childFactory) {

                // TODO: this is the circle dependency. check different than use model
                if (this._isChildFactoryDependentObject(childFactory)) {
                    // dependent object, which should be cached in context of the current entity
                    if (!this.$dependentObjectContext) {
                        // create a new non-cached context for dependent objects
                        this.$dependentObjectContext = this.$context.$datasource.createContext();
                    }

                    return this.$dependentObjectContext;
                }


                return this.$context.$datasource.getContextForChild(childFactory, this);
            },

            createEntity: function(childFactory,id){
                var context = this.getContextForChild(childFactory);

                return context.createEntity(childFactory,id);
            },

            _isChildFactoryDependentObject: function (childFactory) {
                return childFactory && childFactory.prototype.$isDependentObject;
            },

            /**
             * parse the deserializied data
             * @param data
             */
            parse: function (data, action, options) {

                if (!Collection) {
                    try {
                        Collection = require('js/data/Collection');
                    } catch(e) {
                        // because a circular dependency from Entity -> Collection and Collection -> Model -> Entity
                        // we require Collection here, and if Collection is specified as schema, we can use it here
                    }
                }

                var processor = this.$context.$datasource.getProcessorForModel(this);
                data = processor.parse(data, action, options);

                var schema = this.$schema;

                // convert top level properties to Models respective to there schema
                for (var type in schema) {
                    if (schema.hasOwnProperty(type)) {
                        if (data.hasOwnProperty(type)) {
                            // found key in data payload

                            var value = data[type],
                                schemaType = schema[type],
                                factory = null,
                                typeResolver,
                                entity,
                                i,
                                list,
                                alias;

                            if (schemaType instanceof Array) {
                                if (schemaType.length === 1) {
                                    typeResolver = schemaType[0];
                                } else if (schemaType.length === 0) {
                                    this.log('ModelFactory for ListItem for "' + type + '" not defined', 'warn');
                                    factory = Entity;
                                } else {
                                    throw "Cannot determinate ModelFactory. Multiple factories defined for '" + type + "'.";
                                }

                                if (typeResolver instanceof Function) {
                                    factory = typeResolver;
                                    typeResolver = null;
                                }

                                if (value instanceof Array || value === null) {
                                    list = data[type] = new List();


                                    if (value) {
                                        for (i = 0; i < value.length; i++) {

                                            if (typeResolver) {
                                                factory = typeResolver.resolve(value[i], type);
                                            }

                                            if (!(factory && factory.classof(Entity))) {
                                                throw "Factory for type '" + type + "' isn't an instance of Entity";
                                            }

                                            // set alias to type if generic entity
                                            alias = (factory === this.$context.$datasource.$entityFactory ||
                                                factory === this.$context.$datasource.$modelFactory) ? type : null;

                                            entity = this.getContextForChild(factory).createEntity(factory, value[i].id, alias);
                                            entity.set(entity.parse(value[i], action, options));
                                            list.add(entity);
                                        }
                                    }

                                } else {
                                    throw 'Schema for type "' + type + '" requires to be an array';
                                }


                            } else if (Collection && schemaType.classof(Collection)) {

                                var contextForChildren = this.getContextForChild(schemaType);
                                list = data[type] = contextForChildren.createCollection(schemaType, null);
                                list.set(value);

                                if (value instanceof Array || value === null) {

                                    for (i = 0; i < value.length; i++) {
                                        // create new entity based on collection type
                                        entity = contextForChildren.createEntity(list.$modelFactory);
                                        entity.set(entity.parse(value[i], action, options));
                                        // and add it to the collection
                                        list.add(entity);
                                    }
                                } else {
                                    // TODO: what here
//                                throw 'Schema for type "' + type + '" requires to be an array';
                                }
                            } else if (schemaType === Date && value) {
                                data[type] = new Date(value);
                            } else if (schemaType.classof(Entity) && value) {
                                if (schemaType instanceof TypeResolver) {
                                    factory = schemaType.resolve(value, type);
                                } else {
                                    factory = schemaType || Entity;
                                }

                                if (!(factory && factory.classof(Entity))) {
                                    throw "Factory for type '" + type + "' isn't an instance of Entity";
                                }

                                data[type] = entity = this.getContextForChild(factory).createEntity(factory, value.id);
                                entity.set(entity.parse(value, action, options));
                            }
                        }
                    }
                }

                return data;
            },

            prepare: function (action, options) {
                return this.$;
            },

            /***
             * composes the data for serialisation
             * @param dataSource
             * @param action
             * @param options
             * @return {Object} all data that should be serialized
             */
            compose: function (dataSource, action, options) {
                var processor = dataSource.getProcessorForModel(this, options);
                return processor.compose(this, action, options);
            },

            clearErrors: function () {
                this.$errors.clear();
            },

            setErrors: function (errors) {
                for (var key in errors) {
                    if (errors.hasOwnProperty(key)) {
                        this.$errors.set(key, errors[key]);
                    }
                }
            },

            errors: function () {
                return this.$errors;
            },

            clone: function () {
                var ret = this.callBase();
                ret.$context = this.$context;
                return ret;
            }
        });


        return Entity;

    });