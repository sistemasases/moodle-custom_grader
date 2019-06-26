// @flow
/*::
type Item = {
  id: number,
  itemname: number,
  itemtype: boolean,
  grademin: number,
  grademax: number,
  categoryid: string,
  aggregationcoef: number,
  itemtype: <manual|mod|category|course>,
  iteminstance: number // In the case than itemtype is category, iteminstace have the category parent id
};
*/
/*::
type AgregationEnum = {
    SIMPLE: 0,
    PONDERADO:10
}
 */
/*::
type Category = {
  id: number,
  fullname: string,
  depth: number,
  parent: number,
  grade_item: number, //id of the item asociated to this category
  aggregation: AgregationEnum
};
*/
/*::
type Column = {
    text: string
}
 */


/*::
type Student = {
  id: number,
  fistname: string,
  username: string, // moodle user name, in other words, student code
  lastname: string,
  gradeIds: array
};
*/
/*::
type Agregation = {
  id: number,
  name: string
};
*/
/*::
type EditItemResponse = {
    category: Category,
    levels: Array
}
*/

/*::
type Grade = {
  id: number,
  userid: number,
  itemid: number,
  rawgrademin: number,
  rawgrademax: number,
  finalgrade: string,
};
*/
// Generate unique IDs for use as pseudo-private/protected names.
// Similar in concept to
// <http://wiki.ecmascript.org/doku.php?id=strawman:names>.
//
// The goals of this function are twofold:
//
// * Provide a way to generate a string guaranteed to be unique when compared
//   to other strings generated by this function.
// * Make the string complex enough that it is highly unlikely to be
//   accidentally duplicated by hand (this is key if you're using `ID`
//   as a private/protected name on an object).
//
// Use:
//
//     var privateName = ID();
//     var o = { 'public': 'foo' };
//     o[privateName] = 'bar';

define([
    'local_customgrader/vendor-vue',
    'local_customgrader/vendor-vue-router',
    'local_customgrader/vendor-vuex',
    'local_customgrader/vendor-vue-resource',
    'local_customgrader/vendor-vue-js-modal',
    'local_customgrader/vendor-vue-flex',
    'local_customgrader/vendor-vue-toasted',
    'local_customgrader/vendor-loading-indicator',
    'local_customgrader/vendor-lodash',
    'local_customgrader/grader-store',
    'local_customgrader/grader-enums',
    'local_customgrader/grader-utils',
    'local_customgrader/grader-component-main',
    'local_customgrader/grader-router',
    'local_customgrader/grader-filters',
    'local_customgrader/grader-constants',
    ], function (
        Vue,
        VueRouter,
        Vuex,
        VueResource,
        VModal,
        VueFlex,
        VueToasted,
        loading_indicator,
        _,
        g_store,
        g_enums,
        g_utils,
        g_c_main,
        g_router,
        g_filters,
        g_const){
    Vue.use(VueRouter);
    Vue.use(Vuex);
    Vue.use(VueResource);
    Vue.use(VModal.default, { dialog: true });
    Vue.use(VueFlex);
    Vue.use(VueToasted.default, {iconPack: 'custom-class'});
    var graderVueEvents = {
        UPDATE_CATEGORY_OK: 'updateCategoryOK',
        ADD_ELEMENT_OK: 'addElementOK'
    };

    var modalsEnum = {
        EDIT_CATEGORY : 'edit-category',
        EDIT_ITEM : 'edit-item',
        ADD_ELEMENT: 'add-element'
    };

    const categoryElement = { name: 'CATEGORÍA', id: 0 };
    const itemElement = { name: 'ÍTEM', id: 1 };
    const partialExamElement = { name: 'PARCIAL', id: 2 };
    const elementTypes = [categoryElement, itemElement, partialExamElement];

    var store = new Vuex.Store(g_store.store);
    var SelectAggregation = Vue.component('select-aggregation', {
        template: `
            <select 
            v-model="aggregation" 
            @change="changeAggregation($event)" 
            id="aggregation">
                <option 
                v-for="_aggregation in aggregations"
                v-bind:selected="_aggregation.id == aggregation"
                v-bind:value="_aggregation.id"
                >{{_aggregation.name}}</option>
            </select>
        `,
        props: ['initialAggregation'],
        data: function () {
            return {
                aggregation: g_enums.aggregations.SIMPLE,
                aggregations: g_const.aggregations
            }
        },
        created: function () {
            this.aggregation = this.initialAggregation? this.initialAggregation: this.aggregation;
        },
        methods: {
            changeAggregation($event) {
                this.$emit('changeAggregation', $event.target.value);
            }
        }
    });
    var EditCategoryForm = Vue.component('edit-category-form', {
            // language=HTML
            template: `    
                <div class="edit-category-form">
                    <form>
                        <h3>Editando Categoría: {{category.fullname}}</h3>
                            <label for="categoryFullName">
                                Nombre de la categoria
                            </label>
                            <input :disabled="isCourseCategory" id="categoryFullName" v-model="categoryFullName">
                            <label for="aggregation">
                            Tipo de calificación
                            </label>
                            <select-aggregation 
                                    v-bind:initialAggregation="category.aggregation"
                                    v-on:changeAggregation="changeAggregation">
                            </select-aggregation>
                            <button type="button" v-on:click="updateCategory">Guardar</button>
                    </form>
                </div>
            `
        ,
        data: function() {
                return {
                    categoryFullName: '',
                    gradeTypeId: 0,
                    aggregations: g_const.aggregations
                }
        },
        computed: {
            ...Vuex.mapState(['selectedCategoryId']),
            ...Vuex.mapGetters({
                category: 'selectedCategory'
            }),
            isCourseCategory: function () {
                return this.category.depth == 1;
            }
        },
        mounted: function () {
          this.categoryFullName = this.category.fullname;

          this.aggregation = this.category.aggregation;
        },
        methods: {
                setAggretation(aggregation) {
                  this.aggregation = aggregation;
                },
                changeAggregation(aggregation) {
                    this.aggregation = aggregation;
                },
                updateCategory() {
                    this.$store.dispatch(
                        g_store.actions.UPDATE_CATEGORY,
                        {
                            ...this.category,
                            fullname: this.categoryFullName,
                            aggregation: this.aggregation,
                            aggregationcoef: 50
                        })
                        .then(()=> {
                            this.$emit(graderVueEvents.UPDATE_CATEGORY_OK);
                        })
                        .catch( ()=> {
                            this.$toasted.show('Ha habido un error guardando la categoria', {duration: 3000, theme:'bubble'});
                        });
                }
        }
        }
        );
    var CloseModalButton = Vue.component('close-modal-button', {
        template: `
        <i class="fa fa-2x fa-times-circle" v-bind:style="closeButtonStyle"  @click="$modal.hide(modalName)"></i>
        `,
        props: {
            modalName: {
                type: String,
                required: true
            }
        },
        data: function() {
            return {
                closeButtonStyle: {
                    position: "absolute",
                    top: "10px",
                    right: "10px"
                }
            }
        }
    });
    var ModalAddElement = Vue.component('modal-add-element', {
            template: `
       <modal 
        v-bind:name="modalName"
        v-bind:transition="'nice-modal-fade'"
        :draggable="true"
        >
            <add-element-form v-on:addElementOK="$modal.hide(modalName)"></add-element-form>
            <close-modal-button v-bind:modalName="modalName"></close-modal-button>
       </modal>
       `,
        data: function() {
                return {
                    modalName: modalsEnum.ADD_ELEMENT
                }
        }
        });
    var ModalEditCategory = Vue.component('modal-edit-category',{
       template: `<modal
                    v-bind:name="modalName" 
                    v-bind:transition="'nice-modal-fade'"
                    :draggable="true"
                    >
                        <edit-category-form   v-on:updateCategoryOK="$modal.hide(modalName)"></edit-category-form>
                        <close-modal-button v-bind:modalName="modalName"></close-modal-button>
                   </modal>
       `,
        data: function () {
           return {
               modalName: modalsEnum.EDIT_CATEGORY
           }
        }
    });

    var AddElementForm = Vue.component('add-element-form',{
       template: `
        <div class="add-element-form">
           <form>
           <h2>Añadir elemento</h2>
           <label></label>
           <select id="elementType" v-model="elementTypeId">
               <option v-for="elementType in elementTypes" v-bind:value="elementType.id">
                {{elementType.name}}
               </option>
           </select>
           <label for="elementName">
            Nombre de el elemento
            </label>
            <input id="elementName" v-model="elementName">
            <template v-if="parentCategory.aggregation == weigthedMeanOfGrades">
                <label for="elementAggregationCoef">
                    Peso 
                </label>
                        <input 
            placeholder="Ingrese un valor entre 1 y 100" 
            id="elementAggregationCoef" 
            v-model="elementAggregationCoef" type="number">
            </template>
            <template v-if="elementTypeId === categoryElementTypeId || elementTypeId === partialExamElementId">
                <label >
                    Tipo de agregación
                </label>
                <select-aggregation
                    v-bind:changeAggregation="changeAggregation"
                />
            </template>
           <button type="button" v-on:click="createElement()">Añadir</button>
           </form>
       </div>
       `,
        data : function () {
           return {
               elementTypes: elementTypes,
               categoryElementTypeId: categoryElement.id,
               partialExamElementId: partialExamElement.id,
               elementTypeId: itemElement.id,
               elementName: '',
               aggregation: g_enums.aggregations.SIMPLE,
               elementAggregationCoef: ''
           }
        },
        computed: {
            ...Vuex.mapState(['selectedCategoryId', 'course']),
            ...Vuex.mapGetters(['selectedCategory']),
            parentCategory: function () {
                return this.selectedCategory;
            },
            weigthedMeanOfGrades: function () {
                return g_enums.aggregations.PROMEDIO;
            }
        },
        methods: {
           changeAggregation(aggregation) {
             this.aggregation = aggregation;
           },
            extractItem() {
               return {
                   itemname: this.elementName,
                   aggregationcoef: this.elementAggregationCoef,
                   parent_category: this.parentCategory.id,
                   courseid: this.course.id,
               };
            },
            extractPartialExam() {
                return {
                    itemname: this.elementName,
                    aggregationcoef: this.elementAggregationCoef,
                    parent_category: this.parentCategory.id,
                    courseid: this.course.id,
                    aggregation: this.aggregation
                };
            },
            extractCategory() {
              return {
                fullname: this.elementName,
                courseid: this.course.id,
                parent_category: this.parentCategory.id,
                aggregation: this.aggregation
              };
            },
            createItem() {
                const item = this.extractItem();
                this.$store.dispatch(g_store.actions.ADD_ITEM, item)
                    .then(()=> {
                        this.$emit(graderVueEvents.ADD_ELEMENT_OK);
                        this.$toasted.show(
                            `Se ha añadido el item '${item.itemname}'`,
                            { duration : 3000, icon: 'fa fa-check'});
                    })
                    .catch(() => {
                        this.$toasted.show(
                            'Ha ocurrido un error guardando el nuevo item.',
                            {duration: 3000, theme: 'bubble'}
                        )
                    })
            },
            /* examen parcial */
            createCoursePartialExam() {
                const partialExam = this.extractPartialExam();
                this.$store.dispatch(g_store.actions.ADD_PARTIAL_EXAM,  partialExam)
                    .then(()=> {
                        this.$emit(graderVueEvents.ADD_ELEMENT_OK);
                        this.$toasted.show(
                            `Se ha añadido el parcial '${partialExam.itemname}'`,
                            { duration : 3000, icon: 'fa fa-check'});
                    })
                    .catch(() => {
                        this.$toasted.show(
                            'Ha ocurrido un error guardando el nuevo parcial.',
                            {duration: 3000, theme: 'bubble'}
                        )
                    })
            },
            createCategory() {
              const category = this.extractCategory();
              const payload = {category, weight: this.elementAggregationCoef};
              this.$store.dispatch(g_store.actions.ADD_CATEGORY, payload)
                  .then(()=>{
                      this.$emit(graderVueEvents.ADD_ELEMENT_OK);
                      this.$toasted.show(
                          `Se ha añadido la categoria '${category.fullname}'`,
                          { duration : 3000, icon: 'fa fa-check'});
                  })
                  .catch(() => {
                      this.$toasted.show(
                          'Ha ocurrido un error guardando la nueva categoria.',
                          {duration: 3000, theme: 'bubble'}
                      )
                  })
            },
           createElement() {
               if (this.elementTypeId === itemElement.id) {
                    this.createItem();
               } else if(this.elementTypeId === categoryElement.id) {
                   this.createCategory();
               } else if(this.elementTypeId === partialExamElement.id) {
                   this.createCoursePartialExam();
               }
           }
        }

    });
    var ItemMiniMenu = Vue.component('item-mini-menu', {
        template: `
                <div>
                    <i class="fa fa-trash" v-on:click="deleteItem()"></i>
                </div>
            `,
            props: ['itemId'],
            methods: {
                deleteItem() {
                    loading_indicator.show();
                    this.$store.dispatch(g_store.actions.DELETE_ITEM, this.itemId)
                        .then(()=>loading_indicator.hide());
                    }
                }
            }
        );
    var CategoryMiniMenu = Vue.component('category-mini-menu', {
            template: `
                <div class ="category-mini-menu" v-bind:style="style">
                    <i class="fa fa-edit" v-on:click="showEditDialog"></i>
                    <i class="fa fa-plus" v-on:click="showAddElementDialog"></i>
                    <i class="fa fa-trash" v-show="showDelete" v-on:click="showDeleteElementDialog"></i>
                </div>
            `,
        props: {
            categoryId: [Number, String],
            showDelete : {
                type: Boolean,
                required: false,
                default: true
            },
            allowEditName : {
                type: Boolean,
                required: false,
                default: true
            }
        },
        data: function () {
                return {
                    style: {
                        display: "grid",
                        gridTemplateColumns: "repeat(3, max-content)",
                        gridColumnGap: "8px"
                    }
                }
        },
        computed: {
                ...Vuex.mapGetters([
                    'categoryById'
                ]),
            category: function () {
                    return this.categoryById(this.categoryId);
                },
        },
        methods: {
            deleteCategory(){
              return this.$store.dispatch(g_store.actions.DELETE_CATEGORY, this.categoryId)
                  .then(()=> {
                      this.$toasted.show('Se ha borrado la categoria', {duration: 3000});
                  })
                  .catch(()=> {
                      this.$toasted.
                      show('Ha habido un error al borrar la categoria, no se ha borrado', {duration: 3000, theme:'bubble'});
                  });
            },
            showDeleteElementDialog() {
                this.$modal.show('dialog', {
                    title: 'Eliminación de categoria',
                    text: 'Estas a punto de eliminar una categoria',
                    buttons: [
                        {
                            title: 'Borrar',
                            handler: () => {
                                this.deleteCategory()
                                    .finally(()=>this.$modal.hide('dialog'));
                            }
                        },
                        {
                            title: 'Cancelar'
                        }
                    ]
                })
            },
            showEditDialog() {
                this.$store.commit(
                    g_store.mutations.SET_SELECTED_CATEGORY_ID,
                    this.category.id);
                this.$modal.show(modalsEnum.EDIT_CATEGORY);
            },
            showAddElementDialog() {
                this.$store.commit(
                    g_store.mutations.SET_SELECTED_CATEGORY_ID,
                    this.category.id);
                this.$modal.show(modalsEnum.ADD_ELEMENT);
            }
        }
        }
        );
        var ThCourse = Vue.component ('th-course', {
            template: `
            <th 
            v-bind:colspan="colspan"
            @mouseover="showMenu = true"
            @mouseout="showMenu = false"
            >
           
                <flex-row align-v="center" v-bind:style="editZoneStyles" >
                    <span class="gradeitemheader">        
                    {{course.fullname}}       
                    </span>
                    <category-mini-menu v-bind:showDelete="false" v-bind:categoryId="category.id"  v-show="showMenu"></category-mini-menu>
                </flex-row> 
                </th>
            </th>
       `,
            props: ['colspan'],
            data: function () {
                return {
                    showMenu: false,
                    editZoneStyles: {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, max-content)',
                        gridColumnGap: '5px'
                    }
                }
            },
            computed: {
                ...Vuex.mapState(['course']),
                ...Vuex.mapGetters(['courseLevel', 'categoryById']),
                courseCategoryId: function () {
                    return this.courseLevel.object.id;
                },
                category: function () {
                    return this.categoryById(this.courseCategoryId)
                }
            }

        });
        var CourseMiniMenu = Vue.component('course-mini-menu', {
                template: `
                <div v-bind:style="style">
                    <i class="fa fa-plus" v-on:click="showAddElementDialog"></i>
                </div>
            `,
                props: ['categoryId'],
                data: function () {
                    return {
                        style: {
                            display: "grid",
                            gridTemplateColumns: "repeat(3, max-content)",
                            gridColumnGap: "8px"
                        }
                    }
                },
                computed: {
                    ...Vuex.mapGetters([
                        'categoryById'
                    ]),
                    category: function () {
                        return this.categoryById(this.categoryId);
                    },
                },
                methods: {
                    showAddElementDialog() {
                        this.$store.commit(
                            g_store.mutations.SET_SELECTED_CATEGORY_ID,
                            this.category.id);
                        this.$modal.show(modalsEnum.ADD_ELEMENT);
                    }
                }
            }
        );
    var ThCategory = Vue.component('th-category', {
       template : `    
            <th
            class="th-category"
            @mouseover="showMenu = true"
            @mouseout="showMenu = false" 
            v-bind:colspan="childSize" >
                <flex-row align-v="center"  v-bind:style="editZoneStyles">
                   
                    <editable :content="category.fullname" @update="updateCategoryName"></editable>
                    <editable 
                    :sufix="'%'" 
                    @update="saveAggregationCoef($event)"
                    :content="aggregationCoef | round(2)" 
                    v-if="parentCategory.aggregation == weightedAggregation"
                    ></editable>
                    <category-mini-menu v-bind:categoryId="category.id" v-show="showMenu"></category-mini-menu>
                </flex-row>
            </th>
       `,
        props: ['element'],
        data: function() {
           return {
               categoryName: '',
               editZoneStyles: {
                   display: 'grid',
                   gridTemplateColumns: 'repeat(3, max-content)',
                   gridColumnGap: '5px'
               },
               showMenu: false
           }
        },
        computed: {
            ...Vuex.mapGetters([
                'categoryById',
                'categoryChildSize'
            ]),
            ...Vuex.mapState(['items']),
            category: function() {
                return this.categoryById(this.element.object.id);
            },
            childSize: function () {
                return this.categoryChildSize(this.category.id);
            },
            categoryGradeItem: function () {
              return this.items[this.category.grade_item];
            },
            aggregationCoef: function () {
              return this.categoryGradeItem.aggregationcoef;
            },
            parentCategory: function() {
                return this.categoryById(this.category.parent);
            },
            weightedAggregation : function () {
                return g_enums.aggregations.PROMEDIO
            }

        },
        mounted: function (){
          this.categoryName = this.category.fullname;
        },
        methods: {
            updateCategoryName: function (categoryName) {
             this.$store.dispatch(
                 g_store.actions.UPDATE_CATEGORY,
                 {...this.category, fullname: categoryName})
           },
            saveAggregationCoef: function(categoryAggregationCoef) {
                if(categoryAggregationCoef !== this.aggregationCoef) {
                    this.$store.dispatch(g_store.actions.UPDATE_ITEM,
                        {...this.categoryGradeItem, aggregationcoef: categoryAggregationCoef})
                }
            },
           }
    });

    var ItemActionsMini = Vue.component('item-actions-mini', {
        template:`
        
        `,
        props: ['itemId']
    });
    var ThStudentNames = Vue.component('th-student-names', {
       template: `
       <th class="th-student-names"> 
           <flex-row>
               <a v-on:click="changeOrderToLastame()">Apellidos</a> 
               <span>/ </span>
               <a v-on:click="changeOrderToName">Nombres</a>
           </flex-row> 
       </th>
       `,
        data: function () {
          return {
              lastNameDirectionAsc: true,
              firstNameDirectionAsc: true
          }
        },
        methods: {
           changeOrderToLastame() {

                this.$store.commit(
                    g_store.mutations.SET_STUDENT_SORT_METHOD,
                    {
                        name: g_enums.sortStudentMethods.LAST_NAME,
                        order: this.lastNameDirectionAsc? g_enums.sortDirection.ASC : 'desc'
                    });
                this.lastNameDirectionAsc = !this.lastNameDirectionAsc;
           },
            changeOrderToName() {
                this.$store.commit(
                    g_store.mutations.SET_STUDENT_SORT_METHOD,
                    {
                        name: g_enums.sortStudentMethods.FIRST_NAME,
                        order: this.firstNameDirectionAsc? g_enums.sortDirection.ASC : 'desc'
                    });
                this.firstNameDirectionAsc = !this.firstNameDirectionAsc;
            }
        }

    });
    var TrItems = Vue.component('tr-items', {
        template : `
                    <tr class="tr-items">
                    <th-student-names></th-student-names>
                    <th colspan="1" v-for="additionalColumnAtFirst in additionalColumnsAtFirst" v-show="!additionalColumnAtFirst.hide">{{additionalColumnAtFirst.text}}</th>
                    <template v-for="(itemId, index) in orderedItemIds">       
                        <th-item-category 
                        v-if="items[itemId].itemtype === 'category'" 
                        v-bind:itemId="items[itemId].id" 
                        v-bind:colspan="1"
                        ></th-item-category> 
                        
                        <th-item-manual-and-mod 
                        v-if="items[itemId].itemtype === 'manual' || items[itemId].itemtype === 'mod'"  
                        v-bind:itemId="items[itemId].id" 
                        ></th-item-manual-and-mod>
                     </template>
                     <th colspan="1" v-for="additionalColumnAtEnd in additionalColumnsAtEnd">{{additionalColumnAtEnd.text}}</th>
                     </tr>
   `,
        computed: {
            ...Vuex.mapGetters({
                orderedItemIds: 'itemOrderIds'
            }),
            ...Vuex.mapState([
                'additionalColumnsAtFirst',
                'additionalColumnsAtEnd',
                'items'
            ])
        },
    });
        Vue.component('editable',{
            template: `<div contenteditable="true" @blur="update">{{content}}<span>{{sufix}}</span></div>`,
            props:['content', 'sufix'],
            methods:{
                getContent: function (event) {
                    return event.target.innerText.replace(this.sufix, '');
                },
                update:function(event){
                    this.$emit('update', this.getContent(event));
                }
            }
        });

        var ThItemManualAndMod = Vue.component('th-item-manual-and-mod', {
            template : `         
                <th class="th-item-manual-and-mod"
                v-cloak
                 @mouseover="showMenuItems = true"
                 @mouseout="showMenuItems = false"
                ><!--v-on:click="deleteItem(item.id)"-->
                <flex-row v-bind:style="editZoneStyles" align-v="center">
                    <editable :content="item.itemname" @update="saveNameChanges($event)"></editable>
                    <editable
                     :sufix="'%'"
                     :content="item.aggregationcoef | round(2)" 
                     @update="saveAggregationCoefChanges($event)" 
                     v-if="parentCategory.aggregation == weightedAggregation"
                     ></editable>
                    <item-mini-menu v-show="showMenuItems" v-bind:itemId="item.id"></item-mini-menu>
                </flex-row>
                </th>
   `,       data: function () {
                return {
                    showMenuItems: false,
                    editZoneStyles: {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, max-content)',
                        gridColumnGap: '5px'
                    },
                }
            },
            props: ['itemId'],
            methods: {
                ...Vuex.mapActions({
                    deleteItem: g_store.actions.DELETE_ITEM
                }),
                saveNameChanges: function (itemName) {
                    if (itemName !== this.item.itemname) {
                        this.$store.dispatch(
                            g_store.actions.UPDATE_ITEM,
                            {...this.item, itemname: itemName}
                        );
                    }
                },
                saveAggregationCoefChanges: function(itemAggregationCoef) {
                    if (itemAggregationCoef !== this.item.aggregationcoef) {
                        this.$store.dispatch(
                            g_store.actions.UPDATE_ITEM,
                            {...this.item, aggregationcoef: itemAggregationCoef}
                        );
                    }
                }
            },

            computed: {
                ...Vuex.mapState([
                    'items'
                ]),
                ...Vuex.mapGetters(['categoryById']),
                item: function () {
                    return this.items[this.itemId];
                },
                parentCategory: function () {
                    return this.categoryById(this.item.categoryid)
                },
                weightedAggregation: function (){
                    return g_enums.aggregations.PROMEDIO;
                }
            }
        });

        var ThItemCategory = Vue.component('th-item-category', {
            template : `         
                <th class="th-item-category"v-bind:colspan="colspan">
                            {{itemName}}
                </th>
   `,
            props: ['itemId', 'colspan'],
            computed: {
                ...Vuex.mapState([
                    'items'
                ]),
                ...Vuex.mapGetters([
                    'categoryById'
                ]),
                item: function () {
                    return this.items[this.itemId];
                },
                categoryParent: function() {
                    return this.categoryById(this.item.iteminstance);
                },
                itemName: function() {
                    return 'TOTAL ' + this.categoryParent.fullname ;
                }
            },
        });

        var ThStudent = Vue.component('th-student',
            {
                // language=HTML
                template: `
                <th class="th-student"scope="row">
                    {{studentFullName}}
                </th>
                `,
                props: ['studentId'],
                computed: {
                    ...Vuex.mapGetters([
                        'studentById'

                    ]),
                    ...Vuex.mapGetters({
                        students: 'studentSet'
                    }),
                    student: function() {
                        return this.studentById(this.studentId);
                    },
                    studentFullName: function() {
                        return this.student.lastname + ' ' + this.student.firstname;
                    }
                }
            });
        var TdGrade = Vue.component('td-grade',
            {
               template: `
                <td  class="td-grade"
                v-bind:style="this.inputDisabled? { 'background-color': '#e1e4fe!important' } : { }"> 
                <!--{{item.itemtype}}-->
                <input 
                class="grade-input"
                v-bind:disabled="inputDisabled" 
                type="number" 
                v-bind:tabindex="tabIndex" 
                v-bind:step="step"  
                v-bind:max="grade.rawgrademax" 
                v-bind:min="grade.rawgrademin" 
                v-bind:size="decimalPlaces + 1"
                v-model.lazy="finalGrade">
                </td>
                `,
                props: ['gradeId', 'studentIndex', 'itemIndex'],
                methods: {
                    ...Vuex.mapActions({
                        updateGrade: g_store.actions.UPDATE_GRADE
                })
                },
                computed: {

                    ...Vuex.mapState([
                        'grades',
                        'items',
                        'course',
                        'decimalPlaces'
                    ]),
                    step: function() {
                        return Math.pow(10, -this.decimalPlaces);
                    },
                    ...Vuex.mapGetters([
                        'studentsCount'
                    ]),
                    tabIndex: function() {
                      return (this.itemIndex + 1) * this.studentsCount +  this.studentIndex + 1;
                    },
                    inputDisabled: function () {

                        return this.item.itemtype==='category' || this.item.itemtype==='course' ;
                    },
                    grade: function() {
                        return this.grades[this.gradeId];
                    },
                    item: function () {
                      return this.items[this.grade.itemid];
                    },
                    finalGrade: {
                        get() {
                           return g_utils.round(this.grade.finalgrade, this.decimalPlaces);
                        },
                        set(value) {
                            this.grade.finalgrade = value;
                            this.updateGrade(this.grade, this.course.id);
                        }
                    }
                }

            });
        var TrGrades = Vue.component('tr-grades',
            {
                template: `
                <tr 
                v-bind:class="{is_ases: student.is_ases}" 
                v-bind:title="student.is_ases? 'El estudiante pertenece al programa ASES' : ''"
                >
                    <th-student v-bind:studentId="student.id"></th-student>
                    <td >{{student.username}}</td>
                    <td-grade 
                    v-for="(gradeId, index) in studentGradeIdsOrdered" 
                    :key="gradeId"
                    v-bind:studentIndex="studentIndex"
                    v-bind:itemIndex="index"
                    v-bind:gradeId="gradeId"
                    >
                    </td-grade>
                   
                </tr>
                `,
                props: ['studentId', 'studentIndex'],
                computed: {
                    ...Vuex.mapState([
                       'students',
                        'grades'
                    ]),
                    ...Vuex.mapGetters([
                        'itemOrderIds'
                    ]),
                    student: function() {
                      return this.students[this.studentId];
                    },
                    /**
                     * Return the student grades ordered in the same order
                     * than `itemOrderIds`
                     * see g_store.sate.getters.itemOrderIds
                     */
                    studentGradeIdsOrdered: function() {
                        return g_utils.
                        orderGradeIdsInItemSetOrder(
                            this.student.gradeIds,
                            this.grades,
                            this.itemOrderIds
                            );
                    }
                }
            }
            );
        // language=HTML
        var Grader = Vue.component(g_c_main.name, g_c_main.component);


    var Home = Vue.component('home', {
        template: '<div>hola</div>',
        computed: {
            username() {
                // We will see what `params` is shortly
                return this.$route.params.username
            }
        },
        methods: {
            goBack () {
                window.history.length > 1
                    ? this.$router.go(-1)
                    : this.$router.push('/')
            }
        }
    });
    /** Filter registry */
    Vue.filter (g_filters.round.name, g_filters.round.func);

    var router = new VueRouter({
        routes: g_router.routes
    });
     var app = new Vue({
         store: store,
         router: router,
         components: {
             ThCourse,
             Grader,
             EditCategoryForm,
             Home,
             ThCategory,
             TrItems,
             ThItemManualAndMod
         }
     });


    return {
        init: function() {
            app.$mount('#app');
            $(document).ready(function() {

            });
        }
    };
}
);