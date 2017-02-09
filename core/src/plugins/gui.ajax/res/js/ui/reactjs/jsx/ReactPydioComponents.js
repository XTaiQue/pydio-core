ResourcesManager.loadClassesAndApply(['Toolbars'], function(){


(function(global){

    var MessagesConsumerMixin = {
        contextTypes: {
            messages:React.PropTypes.object,
            getMessage:React.PropTypes.func
        }
    };

    /******************************/
    /* REACT DND GENERIC COMPONENTS
    /******************************/
    var Types = {
        NODE_PROVIDER: 'node',
        SORTABLE_LIST_ITEM:'sortable-list-item'
    };

    /**
     * Specifies which props to inject into your component.
     */
    function collect(connect, monitor) {
        return {
            connectDragSource: connect.dragSource(),
            isDragging: monitor.isDragging()
        };
    }

    function collectDrop(connect, monitor){
        return {
            connectDropTarget: connect.dropTarget(),
            canDrop: monitor.canDrop(),
            isOver:monitor.isOver(),
            isOverCurrent:monitor.isOver({shallow:true})
        };
    }


    /***********************/
    /* REACT DND SORTABLE LIST
     /***********************/
    /**
     * Specifies the drag source contract.
     * Only `beginDrag` function is required.
     */
    var sortableItemSource = {
        beginDrag: function (props) {
            // Return the data describing the dragged item
            return { id: props.id };
        },
        endDrag: function(props){
            props.endSwitching();
        }
    };

    var sortableItemTarget = {

        hover: function(props, monitor){
            const draggedId = monitor.getItem().id;
            if (draggedId !== props.id) {
                props.switchItems(draggedId, props.id);
            }
        }

    };

    var sortableItem = React.createClass({

        propTypes:{
            connectDragSource: React.PropTypes.func.isRequired,
            connectDropTarget: React.PropTypes.func.isRequired,
            isDragging: React.PropTypes.bool.isRequired,
            id: React.PropTypes.any.isRequired,
            label: React.PropTypes.string.isRequired,
            switchItems: React.PropTypes.func.isRequired,
            removable: React.PropTypes.bool,
            onRemove:React.PropTypes.func
        },

        removeClicked:function(){
            this.props.onRemove(this.props.id);
        },

        render: function () {
            // Your component receives its own props as usual
            var id = this.props.id;

            // These two props are injected by React DnD,
            // as defined by your `collect` function above:
            var isDragging = this.props.isDragging;
            var connectDragSource = this.props.connectDragSource;
            var connectDropTarget = this.props.connectDropTarget;

            var remove;
            if(this.props.removable){
                remove = <span className="button mdi mdi-close" onClick={this.removeClicked}></span>
            }
            return connectDragSource(connectDropTarget(
                <ReactMUI.Paper zDepth={1} style={{opacity:isDragging?0:1}}>
                    <div className={this.props.className}>
                        {this.props.label}
                        {remove}
                    </div>
                </ReactMUI.Paper>
            ));
        }
    });

    var NonDraggableListItem = React.createClass({
        render: function(){
            var remove;
            if(this.props.removable){
                remove = <span className="button mdi mdi-close" onClick={this.removeClicked}></span>
            }
            return (
                <ReactMUI.Paper zDepth={1}>
                    <div className={this.props.className}>
                        {this.props.label}
                        {remove}
                    </div>
                </ReactMUI.Paper>
            );
        }
    });

    var DraggableListItem;
    if(global.ReactDND){
        DraggableListItem = ReactDND.flow(
            ReactDND.DragSource(Types.SORTABLE_LIST_ITEM, sortableItemSource, collect),
            ReactDND.DropTarget(Types.SORTABLE_LIST_ITEM, sortableItemTarget, collectDrop)
        )(sortableItem);
    }else{
        DraggableListItem = NonDraggableListItem;
    }


    var SortableList = React.createClass({

        propTypes: {
            values: React.PropTypes.array.isRequired,
            onOrderUpdated: React.PropTypes.func,
            removable: React.PropTypes.bool,
            onRemove:React.PropTypes.func,
            className:React.PropTypes.string,
            itemClassName:React.PropTypes.string
        },

        getInitialState: function(){
            return {values: this.props.values};
        },
        componentWillReceiveProps: function(props){
            this.setState({values: props.values, switchData:null});
        },

        findItemIndex: function(itemId, data){
            for(var i=0; i<data.length; i++){
                if(data[i]['payload'] == itemId){
                    return i;
                }
            }
        },

        switchItems:function(oldId, newId){
            var oldIndex = this.findItemIndex(oldId, this.state.values);
            var oldItem = this.state.values[oldIndex];
            var newIndex = this.findItemIndex(newId, this.state.values);
            var newItem = this.state.values[newIndex];

            var currentValues = this.state.values.slice();
            currentValues[oldIndex] = newItem;
            currentValues[newIndex] = oldItem;

            // Check that it did not come back to original state
            var oldPrevious = this.findItemIndex(oldId, this.props.values);
            var newPrevious = this.findItemIndex(newId, this.props.values);
            if(oldPrevious == newIndex && newPrevious == oldIndex){
                this.setState({values:currentValues, switchData:null})
                //console.log("no more moves");
            }else{
                this.setState({values:currentValues, switchData:{oldId:oldId, newId:newId}});
                //console.log({oldId:oldIndex, newId:newIndex});
            }

        },

        endSwitching:function(){
            if(this.state.switchData){
                // Check that it did not come back to original state
                if(this.props.onOrderUpdated){
                    this.props.onOrderUpdated(this.state.switchData.oldId, this.state.switchData.newId, this.state.values);
                }
            }
            this.setState({switchData:null});
        },

        render: function(){
            var switchItems = this.switchItems;
            return (
                <div className={this.props.className}>
                    {this.state.values.map(function(item){
                        return <DraggableListItem
                            id={item.payload}
                            key={item.payload}
                            label={item.text}
                            switchItems={switchItems}
                            endSwitching={this.endSwitching}
                            removable={this.props.removable}
                            onRemove={this.props.onRemove}
                            className={this.props.itemClassName}
                        />
                    }.bind(this))}
                </div>
            )
        }
    });

    /****************************/
    /* REACT DND DRAG/DROP NODES
     /***************************/

    var nodeDragSource = {
        beginDrag: function (props) {
            // Return the data describing the dragged item
            return { node: props.node };
        },

        endDrag: function (props, monitor, component) {
            if (!monitor.didDrop()) {
                return;
            }
            var item = monitor.getItem();
            var dropResult = monitor.getDropResult();
            var dnd = pydio.Controller.defaultActions.get("dragndrop");
            if(dnd){
                var dndAction = pydio.Controller.getActionByName(dnd);
                // Make sure to enable
                dndAction.enable();
                dndAction.apply([item.node, dropResult.node]);
            }

        }
    };

    var nodeDropTarget = {

        hover: function(props, monitor){
        },

        canDrop: function(props, monitor){

            var source = monitor.getItem().node;
            var target = props.node;

            var dnd = pydio.Controller.defaultActions.get("dragndrop");
            if(dnd){
                var dndAction = pydio.Controller.getActionByName(dnd);
                // Make sure to enable
                dndAction.enable();
                // Manually apply, do not use action.apply(), as it will
                // catch the exception we are trying to detect.
                global.actionArguments = [source, target, "canDrop"];
                try {
                    eval(dndAction.options.callbackCode);
                } catch (e) {
                    return false;
                }
                return true;
            }
            return false;
        },

        drop: function(props, monitor){
            var hasDroppedOnChild = monitor.didDrop();
            if (hasDroppedOnChild) {
                return;
            }
            return { node: props.node }
        }

    };


    /*******************/
    /* MISC COMPONENTS */
    /*******************/

    /**
     * Tree Node
     */
    var SimpleTreeNode = React.createClass({

        propTypes:{
            collapse:React.PropTypes.bool,
            forceExpand:React.PropTypes.bool,
            childrenOnly:React.PropTypes.bool,
            depth:React.PropTypes.number,
            onNodeSelect:React.PropTypes.func,
            node:React.PropTypes.instanceOf(AjxpNode),
            dataModel:React.PropTypes.instanceOf(PydioDataModel),
            forceLabel:React.PropTypes.string,
            // Optional currently selected detection
            nodeIsSelected: React.PropTypes.func,
            // Optional checkboxes
            checkboxes:React.PropTypes.array,
            checkboxesValues:React.PropTypes.object,
            checkboxesComputeStatus:React.PropTypes.func,
            onCheckboxCheck:React.PropTypes.func
        },

        getDefaultProps:function(){
            return {
                collapse: false,
                childrenOnly: false,
                depth:0,
                onNodeSelect: function(node){}
            }
        },

        listenToNode: function(node){
            this._childrenListener = function(){
                if(!this.isMounted()) return;
                this.setState({children:this._nodeToChildren(node)});
            }.bind(this);
            this._nodeListener = function(){
                if(!this.isMounted()) return;
                this.forceUpdate();
            }.bind(this);
            node.observe("child_added", this._childrenListener);
            node.observe("child_removed", this._childrenListener);
            node.observe("node_replaced", this._nodeListener);
        },

        stopListening: function(node){
            node.stopObserving("child_added", this._childrenListener);
            node.stopObserving("child_removed", this._childrenListener);
            node.stopObserving("node_replaced", this._nodeListener);
        },

        componentDidMount: function(){
            this.listenToNode(this.props.node);
        },
        
        componentWillUnmount:function(){
            this.stopListening(this.props.node);
        },
        
        componentWillReceiveProps: function(nextProps){
            var oldNode = this.props.node;
            var newNode = nextProps.node;
            if(newNode == oldNode && newNode.getMetadata().get("paginationData")){
                var remapedChildren = this.state.children.map(function(c){c.setParent(newNode);return c;});
                var remapedPathes = this.state.children.map(function(c){return c.getPath()});
                var newChildren = this._nodeToChildren(newNode);
                newChildren.forEach(function(nc){
                    if(remapedPathes.indexOf(nc.getPath()) === -1){
                        remapedChildren.push(nc);
                    }
                });
                this.setState({children:remapedChildren});
            }else{
                this.setState({children:this._nodeToChildren(newNode)});
            }
            if(newNode !== oldNode){
                this.stopListening(oldNode);
                this.listenToNode(newNode);
            }
        },

        getInitialState: function(){
            return {
                showChildren: !this.props.collapse || this.props.forceExpand,
                children:this._nodeToChildren(this.props.node)
            };
        },

        _nodeToChildren:function(){
            var children = [];
            this.props.node.getChildren().forEach(function(c){
                if(!c.isLeaf() || c.getAjxpMime() === 'ajxp_browsable_archive') children.push(c);
            });
            return children;
        },

        onNodeSelect: function (ev) {
            if (this.props.onNodeSelect) {
                this.props.onNodeSelect(this.props.node);
            }
            ev.preventDefault();
            ev.stopPropagation();
        },
        onChildDisplayToggle: function (ev) {
            if (this.props.node.getChildren().size) {
                this.setState({showChildren: !this.state.showChildren});
            }
            ev.preventDefault();
            ev.stopPropagation();
        },
        nodeIsSelected: function(n){
            if(this.props.nodeIsSelected) return this.props.nodeIsSelected(n);
            else return (this.props.dataModel.getSelectedNodes().indexOf(n) !== -1);
        },
        render: function () {
            var hasFolderChildrens = this.state.children.length?true:false;
            var hasChildren;
            if(hasFolderChildrens){
                hasChildren = (
                    <span onClick={this.onChildDisplayToggle}>
                {this.state.showChildren || this.props.forceExpand?
                    <span className="tree-icon icon-angle-down"></span>:
                    <span className="tree-icon icon-angle-right"></span>
                }
                </span>);
            }else{
                let cname = "tree-icon icon-angle-right";
                if(this.props.node.isLoaded()){
                    cname += " no-folder-children";
                }
                hasChildren = <span className={cname}></span>;
            }
            var isSelected = (this.nodeIsSelected(this.props.node) ? 'mui-menu-item mui-is-selected' : 'mui-menu-item');
            var selfLabel;
            if(!this.props.childrenOnly){
                if(this.props.canDrop && this.props.isOverCurrent){
                    isSelected += ' droppable-active';
                }
                var boxes;
                if(this.props.checkboxes){
                    var values = {}, inherited = false, disabled = {}, additionalClassName = '';
                    if(this.props.checkboxesComputeStatus){
                        var status = this.props.checkboxesComputeStatus(this.props.node);
                        values = status.VALUES;
                        inherited = status.INHERITED;
                        disabled = status.DISABLED;
                        if(status.CLASSNAME) additionalClassName = ' ' + status.CLASSNAME;
                    }else if(this.props.checkboxesValues && this.props.checkboxesValues[this.props.node.getPath()]){
                        values = this.props.checkboxesValues[this.props.node.getPath()];
                    }
                    var valueClasses = [];
                    boxes = this.props.checkboxes.map(function(c){
                        var selected = values[c] !== undefined ? values[c] : false;
                        var click = function(event, value){
                            this.props.onCheckboxCheck(this.props.node, c, value);
                        }.bind(this);
                        if(selected) valueClasses.push(c);
                        return (
                            <ReactMUI.Checkbox
                                name={c}
                                key={c+"-"+(selected?"true":"false")}
                                checked={selected}
                                onCheck={click}
                                disabled={disabled[c]}
                                className={"cbox-" + c}
                            />
                        );
                    }.bind(this));
                    isSelected += inherited?" inherited ":"";
                    isSelected += valueClasses.length ? (" checkbox-values-" + valueClasses.join('-')) : " checkbox-values-empty";
                    boxes = <div className={"tree-checkboxes" + additionalClassName}>{boxes}</div>;
                }
                selfLabel = (
                    <div className={'tree-item ' + isSelected + (boxes?' has-checkboxes':'')} style={{paddingLeft:this.props.depth*20}}>
                        <div className="tree-item-label" onClick={this.onNodeSelect} title={this.props.node.getLabel()}
                            data-id={this.props.node.getPath()}>
                        {hasChildren}<span className="tree-icon icon-folder-close"></span>{this.props.forceLabel?this.props.forceLabel:this.props.node.getLabel()}
                        </div>
                        {boxes}
                    </div>
                );
            }

            var children = [];
            if(this.state.showChildren || this.props.forceExpand){
                children = this.state.children.map(function(child) {
                    return (<DragDropTreeNode
                            childrenOnly={false}
                            forceExpand={this.props.forceExpand}
                            key={child.getPath()}
                            dataModel={this.props.dataModel}
                            node={child}
                            onNodeSelect={this.props.onNodeSelect}
                            nodeIsSelected={this.props.nodeIsSelected}
                            collapse={this.props.collapse}
                            depth={this.props.depth+1}
                            checkboxes={this.props.checkboxes}
                            checkboxesValues={this.props.checkboxesValues}
                            checkboxesComputeStatus={this.props.checkboxesComputeStatus}
                            onCheckboxCheck={this.props.onCheckboxCheck}
                        />);
                }.bind(this));
            }
            return (
                <li ref="node" className={"treenode" + this.props.node.getPath().replace(/\//g, '_')}>
                    {selfLabel}
                    <ul>
                        {children}
                    </ul>
                </li>
            );
        }
    });

    var WrappedTreeNode = React.createClass({
        propTypes:{
            connectDragSource: React.PropTypes.func.isRequired,
            connectDropTarget: React.PropTypes.func.isRequired,
            isDragging: React.PropTypes.bool.isRequired,
            isOver: React.PropTypes.bool.isRequired,
            canDrop: React.PropTypes.bool.isRequired
        },

        render: function () {
            var connectDragSource = this.props.connectDragSource;
            var connectDropTarget = this.props.connectDropTarget;

            return connectDragSource(connectDropTarget(
                <SimpleTreeNode {...this.props}/>
            ));
        }
    });

    var DragDropTreeNode;
    if(global.ReactDND){
        DragDropTreeNode = ReactDND.flow(
            ReactDND.DragSource(Types.NODE_PROVIDER, nodeDragSource, collect),
            ReactDND.DropTarget(Types.NODE_PROVIDER, nodeDropTarget, collectDrop)
        )(WrappedTreeNode);
    }else{
        DragDropTreeNode = SimpleTreeNode;
    }




    /**
     * Simple openable / loadable tree taking AjxpNode as inputs
     */
    var SimpleTree = React.createClass({

        propTypes:{
            showRoot:React.PropTypes.bool,
            rootLabel:React.PropTypes.string,
            onNodeSelect:React.PropTypes.func,
            node:React.PropTypes.instanceOf(AjxpNode).isRequired,
            dataModel:React.PropTypes.instanceOf(PydioDataModel).isRequired,
            selectable:React.PropTypes.bool,
            selectableMultiple:React.PropTypes.bool,
            initialSelectionModel:React.PropTypes.array,
            onSelectionChange:React.PropTypes.func,
            forceExpand:React.PropTypes.bool,
            // Optional currently selected detection
            nodeIsSelected: React.PropTypes.func,
            // Optional checkboxes
            checkboxes:React.PropTypes.array,
            checkboxesValues:React.PropTypes.object,
            checkboxesComputeStatus:React.PropTypes.func,
            onCheckboxCheck:React.PropTypes.func
        },

        getDefaultProps:function(){
            return {
                showRoot:true,
                onNodeSelect: this.onNodeSelect
            }
        },

        onNodeSelect: function(node){
            if(this.props.onNodeSelect){
                this.props.onNodeSelect(node);
            }else{
                this.props.dataModel.setSelectedNodes([node]);
            }
        },

        render: function(){
            return(
                <ul className={this.props.className}>
                    <DragDropTreeNode
                        childrenOnly={!this.props.showRoot}
                        forceExpand={this.props.forceExpand}
                        node={this.props.node?this.props.node:this.props.dataModel.getRootNode()}
                        dataModel={this.props.dataModel}
                        onNodeSelect={this.onNodeSelect}
                        nodeIsSelected={this.props.nodeIsSelected}
                        forceLabel={this.props.rootLabel}
                        checkboxes={this.props.checkboxes}
                        checkboxesValues={this.props.checkboxesValues}
                        checkboxesComputeStatus={this.props.checkboxesComputeStatus}
                        onCheckboxCheck={this.props.onCheckboxCheck}
                    />
                </ul>
            )
        }
    });

    /**
     * Simple MuiPaper with a figure and a legend
     */
    var SimpleFigureBadge = React.createClass({

        propTypes:{
            colorIndicator:React.PropTypes.string,
            figure:React.PropTypes.number.isRequired,
            legend:React.PropTypes.string
        },

        getDefaultProps:function(){
            return {
                colorIndicator: ''
            }
        },

        render: function(){
            return (
                <ReactMUI.Paper style={{display:'inline-block', marginLeft:16}}>
                    <div className="figure-badge" style={(this.props.colorIndicator?{borderLeftColor:this.props.colorIndicator}:{})}>
                        <div className="figure">{this.props.figure}</div>
                        <div className="legend">{this.props.legend}</div>
                    </div>
                </ReactMUI.Paper>
            );
        }
    });

    /**
     * Search input building a set of query parameters and calling
     * the callbacks to display / hide results
     */
    var SearchBox = React.createClass({

        propTypes:{
            // Required
            parameters:React.PropTypes.object.isRequired,
            queryParameterName:React.PropTypes.string.isRequired,
            // Other
            textLabel:React.PropTypes.string,
            displayResults:React.PropTypes.func,
            hideResults:React.PropTypes.func,
            displayResultsState:React.PropTypes.bool,
            limit:React.PropTypes.number
        },

        getInitialState: function(){
            return {
                displayResult:this.props.displayResultsState?true:false
            };
        },

        getDefaultProps: function(){
            var dm = new PydioDataModel();
            dm.setRootNode(new AjxpNode());
            return {dataModel: dm};
        },

        displayResultsState: function(){
            this.setState({
                displayResult:true
            });
        },

        hideResultsState: function(){
            this.setState({
                displayResult:false
            });
            this.props.hideResults();
        },

        onClickSearch: function(){
            var value = this.refs.query.getValue();
            var dm = this.props.dataModel;
            var params = this.props.parameters;
            params[this.props.queryParameterName] = value;
            params['limit'] = this.props.limit || 100;
            dm.getRootNode().setChildren([]);
            PydioApi.getClient().request(params, function(transport){
                var remoteNodeProvider = new RemoteNodeProvider({});
                remoteNodeProvider.parseNodes(dm.getRootNode(), transport);
                dm.getRootNode().setLoaded(true);
                this.displayResultsState();
                this.props.displayResults(value, dm);
            }.bind(this));
        },

        keyDown: function(event){
            if(event.key == 'Enter'){
                this.onClickSearch();
            }
        },

        render: function(){
            return (
                <div className={(this.props.className?this.props.className:'')}>
                    <div style={{paddingTop:22, float:'right', opacity:0.3}}>
                        <ReactMUI.IconButton
                            ref="button"
                            onClick={this.onClickSearch}
                            iconClassName="icon-search"
                            tooltip="Search"
                            />
                    </div>
                    <div className="searchbox-input-fill" style={{width: 220, float:'right'}}>
                        <ReactMUI.TextField ref="query" onKeyDown={this.keyDown} floatingLabelText={this.props.textLabel}/>
                    </div>
                </div>
            );
        }

    });

    var LabelWithTip = React.createClass({

        propTypes: {
            label:React.PropTypes.string,
            labelElement:React.PropTypes.object,
            tooltip:React.PropTypes.string,
            tooltipClassName:React.PropTypes.string,
            className:React.PropTypes.string,
            style:React.PropTypes.object
        },

        getInitialState:function(){
            return {show:false};
        },

        show:function(){this.setState({show:true});},
        hide:function(){this.setState({show:false});},

        render:function(){
            if(this.props.tooltip){
                let tooltipStyle={};
                if(this.props.label || this.props.labelElement){
                    if(this.state.show){
                        tooltipStyle = {bottom: -10, top: 'inherit'};
                    }
                }else{
                    tooltipStyle = {position:'relative'};
                }
                let label;
                if(this.props.label){
                    label = <span className="ellipsis-label">{this.props.label}</span>;
                }else if(this.props.labelElement){
                    label = this.props.labelElement;
                }
                let style = this.props.style || {position:'relative'};

                return (
                    <span onMouseEnter={this.show} onMouseLeave={this.hide} style={style} className={this.props.className}>
                        {label}
                        {this.props.children}
                        <ReactMUI.Tooltip label={this.props.tooltip} style={tooltipStyle} className={this.props.tooltipClassName} show={this.state.show}/>
                    </span>
                );
            }else{
                if(this.props.label) {
                    return <span>{this.props.label}</span>;
                } else if(this.props.labelElement) {
                    return this.props.labelElement;
                } else {
                    return <span>{this.props.children}</span>;
                }
            }
        }

    });

    /**
     * Get info from Pydio controller an build an
     * action bar with active actions.
     * TBC
     */
    var SimpleReactActionBar = React.createClass({

        propTypes:{
            dataModel:React.PropTypes.instanceOf(PydioDataModel).isRequired,
            node:React.PropTypes.instanceOf(AjxpNode).isRequired,
            actions:React.PropTypes.array
        },

        clickAction: function(event){
            var actionName = event.currentTarget.getAttribute("data-action");
            this.props.dataModel.setSelectedNodes([this.props.node]);
            var a = global.pydio.Controller.getActionByName(actionName);
            a.fireContextChange(this.props.dataModel, true, global.pydio.user);
            //a.fireSelectionChange(this.props.dataModel);
            a.apply([this.props.dataModel]);
            event.stopPropagation();
            event.preventDefault();
        },

        render: function(){
            var actions = this.props.actions.map(function(a){
                return(
                    <div
                        key={a.options.name}
                        className={a.options.icon_class+' material-list-action-inline' || ''}
                        title={a.options.title}
                        data-action={a.options.name}
                        onClick={this.clickAction}></div>
                );
            }.bind(this));
            return(
                <span>
                    {actions}
                </span>
            );

        }
    });


    /*******************/
    /* GENERIC EDITORS */
    /*******************/

    var LegacyUIWrapper = React.createClass({
        propTypes:{
            componentName:React.PropTypes.string.isRequired,
            componentOptions:React.PropTypes.object,
            onLoadCallback:React.PropTypes.func
        },

        componentDidMount(){
            if(window[this.props.componentName]){
                var element = this.refs.wrapper.getDOMNode();
                var options = this.props.componentOptions;
                this.legacyComponent = new window[this.props.componentName](element, options);
                if(this.props.onLoadCallback){
                    this.props.onLoadCallback(this.legacyComponent);
                }
            }
        },

        componentWillUnmount(){
            if(this.legacyComponent){
                this.legacyComponent.destroy();
            }
        },

        shouldComponentUpdate: function() {
            // Let's just never update this component again.
            return false;
        },

        render: function(){
            return <div id={this.props.id} className={this.props.className} style={this.props.style} ref="wrapper"></div>;
        }
    });
    /**
     * Opens an oldschool Pydio editor in React context, based on node mime type.
     * @type {*|Function}
     */
    var ReactEditorOpener = React.createClass({

        propTypes:{
            node:React.PropTypes.instanceOf(AjxpNode),
            registry:React.PropTypes.instanceOf(Registry).isRequired,
            closeEditorContainer:React.PropTypes.func.isRequired,
            editorData:React.PropTypes.object,
            registerCloseCallback:React.PropTypes.func
        },

        getInitialState: function(){
            return {editorData: null};
        },

        _getEditorData: function(node){
            var selectedMime = getAjxpMimeType(node);
            var editors = this.props.registry.findEditorsForMime(selectedMime, false);
            if(editors.length && editors[0].openable){
                return editors[0];
            }
        },

        closeEditor: function(){
            if(this.editor){
                var el = this.editor.element;
                this.editor.destroy();
                try{el.remove();}catch(e){}
                this.editor = null;
            }
            if(this.props.closeEditorContainer() !== false){
                this.setState({editorData: null, node:null});
            }
        },

        loadEditor: function(node, editorData){
            this._blockUpdates = false;

            if(this.editor){
                this.closeEditor();
            }
            if(!editorData){
                editorData = this._getEditorData(node);
            }
            if(editorData) {
                this.props.registry.loadEditorResources(editorData.resourcesManager);
                this.setState({editorData: editorData, node:node}, this._loadPydioEditor.bind(this));
            }else{
                this.setState({editorData: null, node:null}, this._loadPydioEditor.bind(this));
            }
        },

        componentDidMount:function(){
            if(this.props.node) {
                this.loadEditor(this.props.node, this.props.editorData);
            }
        },

        componentWillReceiveProps:function(newProps){
            this._blockUpdates = false;
            if(newProps.node && newProps.node !== this.props.node) {
                this.loadEditor(newProps.node, newProps.editorData);
            }else if(newProps.node && newProps.node === this.props.node){
                this._blockUpdates = true;
            }
        },
        
        componentDidUpdate:function(){
            if(this.editor && this.editor.resize){
                this.editor.resize();
            }
        },

        componentWillUnmount:function(){
            if(this.editor){
                this.editor.destroy();
                this.editor = null;
            }
        },

        shouldComponentUpdate:function(){
            if(this._blockUpdates){
                return false;
            }else{
                return true;
            }
        },

        _loadPydioEditor: function(){
            if(this.editor){
                this.editor.destroy();
                this.editor = null;
            }
            if(this.state.editorData && this.state.editorData.formId && this.props.node){
                var editorElement = $(this.refs.editor.getDOMNode()).down('#'+this.state.editorData.formId);
                if(editorElement){
                    var editorOptions = {
                        closable: false,
                        context: this,
                        editorData: this.state.editorData
                    };
                    this.editor = new global[editorOptions.editorData['editorClass']](editorElement, editorOptions);
                    this.editor.open(this.props.node);
                    fitHeightToBottom(editorElement);
                }
            }
        },

        render: function(){
            var editor;
            if(this.state.editorData){
                if(this.state.editorData.formId){
                    var content = function(){
                        if(this.state && this.state.editorData && $(this.state.editorData.formId)){
                            return {__html:$(this.state.editorData.formId).outerHTML};
                        }else{
                            return {__html:''};
                        }
                    }.bind(this);
                    editor = <div ref="editor" className="vertical_layout vertical_fit" id="editor" key={this.state && this.props.node?this.props.node.getPath():null} dangerouslySetInnerHTML={content()}></div>;
                }else if(global[this.state.editorData.editorClass]){
                    editor = React.createElement(global[this.state.editorData.editorClass], {
                        node:this.props.node,
                        closeEditor:this.closeEditor,
                        registerCloseCallback:this.props.registerCloseCallback
                    });
                }
            }
            return editor || null;
        }
    });

    /**
     * Two columns layout used for Workspaces and Plugins editors
     */
    var PaperEditorLayout = React.createClass({

        propTypes:{
            title:React.PropTypes.any,
            titleActionBar:React.PropTypes.any,
            leftNav:React.PropTypes.any,
            contentFill:React.PropTypes.bool,
            className:React.PropTypes.string
        },


        toggleMenu:function(){
            var crtLeftOpen = (this.state && this.state.forceLeftOpen);
            this.setState({forceLeftOpen:!crtLeftOpen});
        },

        render:function(){
            return (
                <div className={"paper-editor-content layout-fill vertical-layout" + (this.props.className?' '+ this.props.className:'')}>
                    <div className="paper-editor-title">
                        <h2>{this.props.title} <div className="left-picker-toggle"><ReactMUI.IconButton iconClassName="icon-caret-down" onClick={this.toggleMenu} /></div></h2>
                        <div className="title-bar">{this.props.titleActionBar}</div>
                    </div>
                    <div className="layout-fill main-layout-nav-to-stack">
                        <div className={"paper-editor-left" + (this.state && this.state.forceLeftOpen? ' picker-open':'')} onClick={this.toggleMenu} >
                            {this.props.leftNav}
                        </div>
                        <div className={"layout-fill paper-editor-right" + (this.props.contentFill?' vertical-layout':'')} style={this.props.contentFill?{}:{overflowY: 'auto'}}>
                            {this.props.children}
                        </div>
                    </div>
                </div>
            );
        }
    });
    /**
     * Navigation subheader used by PaperEditorLayout
     */
    var PaperEditorNavHeader = React.createClass({

        propTypes:{
            label:React.PropTypes.string
        },

        render:function(){

            return (
                <div className="mui-subheader">
                    {this.props.children}
                    {this.props.label}
                </div>
            );

        }

    });
    /**
     * Navigation entry used by PaperEditorLayout.
     */
    var PaperEditorNavEntry = React.createClass({

        propTypes:{
            keyName:React.PropTypes.string.isRequired,
            onClick:React.PropTypes.func.isRequired,
            label:React.PropTypes.string,
            selectedKey:React.PropTypes.string,
            isLast:React.PropTypes.bool,
            // Drop Down Data
            dropDown:React.PropTypes.bool,
            dropDownData:React.PropTypes.object,
            dropDownChange:React.PropTypes.func,
            dropDownDefaultItems:React.PropTypes.array
        },

        onClick:function(){
            this.props.onClick(this.props.keyName);
        },

        captureDropDownClick: function(){
            if(this.preventClick){
                this.preventClick = false;
                return;
            }
            this.props.onClick(this.props.keyName);
        },

        dropDownChange: function(event, index, item){
            this.preventClick = true;
            this.props.dropDownChange(item);
        },

        render:function(){

            if(!this.props.dropDown || !this.props.dropDownData){
                return (
                    <div
                        className={'menu-entry' + (this.props.keyName==this.props.selectedKey?' menu-entry-selected':'') + (this.props.isLast?' last':'')}
                        onClick={this.onClick}>
                        {this.props.children}
                        {this.props.label}
                    </div>
                );
            }

            // dropDown & dropDownData are loaded
            var menuItemsTpl = [{text:this.props.label, payload:'-1'}];
            if(this.props.dropDownDefaultItems){
                menuItemsTpl = menuItemsTpl.concat(this.props.dropDownDefaultItems);
            }
            this.props.dropDownData.forEach(function(v, k){
                menuItemsTpl.push({text:v.label, payload:v});
            });
            return (
                <div onClick={this.captureDropDownClick} className={'menu-entry-dropdown' + (this.props.keyName==this.props.selectedKey?' menu-entry-selected':'') + (this.props.isLast?' last':'')}>
                    <ReactMUI.DropDownMenu
                        menuItems={menuItemsTpl}
                        className="dropdown-full-width"
                        style={{width:256}}
                        autoWidth={false}
                        onChange={this.dropDownChange}
                        />
                </div>
            );

        }
    });

    /**************************/
    /* GENERIC LIST COMPONENT */
    /**************************/

    /**
     * Pagination component reading metadata "paginationData" from current node.
     */
    var ListPaginator = React.createClass({

        mixins:[MessagesConsumerMixin],

        propTypes:{
            dataModel:React.PropTypes.instanceOf(PydioDataModel).isRequired,
            node:React.PropTypes.instanceOf(AjxpNode).isRequired
        },

        changePage: function(event){
            this.props.node.getMetadata().get("paginationData").set("new_page", event.currentTarget.getAttribute('data-page'));
            this.props.dataModel.requireContextChange(this.props.node);
        },

        onMenuChange:function(event, index, item){
            this.props.node.getMetadata().get("paginationData").set("new_page", item.payload);
            this.props.dataModel.requireContextChange(this.props.node);
        },

        render: function(){
            var pData = this.props.node.getMetadata().get("paginationData");
            var current = parseInt(pData.get("current"));
            var total = parseInt(pData.get("total"));
            var pages = [], next, last, previous, first;
            var pageWord = this.context.getMessage('331', '');
            for(var i=1; i <= total; i++){
                pages.push({payload:i, text:pageWord + ' ' +i + (i == current?(' / ' + total ): '')});
            }
            if(!pages.length){
                return null;
            }
            if(current > 1) previous = <ReactMUI.FontIcon onClick={this.changePage} data-page={current-1} className="icon-angle-left" />;
            if(current < total) next = <ReactMUI.FontIcon onClick={this.changePage} data-page={current+1} className="icon-angle-right" />;
            return (
                <span>
                    {first}
                    {previous}
                    <ReactMUI.DropDownMenu onChange={this.onMenuChange} menuItems={pages} selectedIndex={current-1} />
                    {next}
                    {last}
                    <span className="mui-toolbar-separator">&nbsp;</span>
                </span>
            );
        }

    });

    let ListEntryNodeListenerMixin = {

        attach: function(node){
            this._nodeListener = function(){
                if(!this.isMounted()) {
                    this.detach(node);
                    return;
                }
                this.forceUpdate();
            }.bind(this);
            this._actionListener = function(eventMemo){
                if(!this.isMounted()) {
                    this.detach(node);
                    return;
                }
                if(eventMemo && eventMemo.type === 'prompt-rename' && eventMemo.callback){
                    this.setState({inlineEdition:true, inlineEditionCallback:eventMemo.callback});
                }
                return true;
            }.bind(this);
            node.observe("node_replaced", this._nodeListener);
            node.observe("node_action", this._actionListener);
        },

        detach: function(node){
            if(this._nodeListener){
                node.stopObserving("node_replaced", this._nodeListener);
                node.stopObserving("node_action", this._actionListener);
            }
        },

        componentDidMount: function(){
            this.attach(this.props.node);
        },

        componentWillUnmount: function(){
            this.detach(this.props.node);
        },

    };

    /**
     * Material List Entry
     */
    var ListEntry = React.createClass({

        mixins:[Toolbars.ContextMenuNodeProviderMixin],
        
        propTypes:{
            showSelector:React.PropTypes.bool,
            selected:React.PropTypes.bool,
            selectorDisabled:React.PropTypes.bool,
            onSelect:React.PropTypes.func,
            onClick:React.PropTypes.func,
            iconCell:React.PropTypes.element,
            mainIcon:React.PropTypes.string,
            firstLine:React.PropTypes.node,
            secondLine:React.PropTypes.node,
            thirdLine:React.PropTypes.node,
            actions:React.PropTypes.element,
            activeDroppable:React.PropTypes.bool,
            className:React.PropTypes.string,
            style: React.PropTypes.object
        },

        onClick: function(event){
            if(this.props.showSelector) {
                if(this.props.selectorDisabled) return;
                this.props.onSelect(this.props.node);
                event.stopPropagation();
                event.preventDefault();
            }else if(this.props.onClick){
                this.props.onClick(this.props.node);
            }
        },
        
        onDoubleClick: function(event){
            if(this.props.onDoubleClick){
                this.props.onDoubleClick(this.props.node);
            }
        },
        
        render: function(){
            var selector;
            if(this.props.showSelector){
                selector = (
                    <div className="material-list-selector">
                        <ReactMUI.Checkbox checked={this.props.selected} ref="selector" disabled={this.props.selectorDisabled}/>
                    </div>
                );
            }
            var iconCell;
            if(this.props.iconCell){
                iconCell = this.props.iconCell;
            }else if(this.props.mainIcon){
                iconCell = <ReactMUI.FontIcon className={this.props.mainIcon}/>;
            }
            var additionalClassName = this.props.className ? this.props.className + ' ' : '';
            if(this.props.canDrop && this.props.isOver){
                additionalClassName += ' droppable-active ';
            }
            if(this.props.node){
                additionalClassName += ' listentry' + this.props.node.getPath().replace(/\//g, '_') + ' ' + ' ajxp_node_' + (this.props.node.isLeaf()?'leaf':'collection') + ' ';
                if(this.props.node.getAjxpMime()){
                    additionalClassName += ' ajxp_mime_' + this.props.node.getAjxpMime() + ' ';
                }
            }
            return (
                <div onClick={this.onClick}
                     onDoubleClick={this.props.showSelector?null:this.onDoubleClick}
                     onContextMenu={this.contextMenuNodeResponder}
                     className={additionalClassName + "material-list-entry material-list-entry-" + (this.props.thirdLine?3:this.props.secondLine?2:1) + "-lines"+ (this.props.selected? " selected":"")}
                     style={this.props.style}>
                    {selector}
                    <div className={"material-list-icon" + ((this.props.mainIcon || iconCell)?"":" material-list-icon-none")}>
                        {iconCell}
                    </div>
                    <div className="material-list-text">
                        <div className="material-list-line-1">{this.props.firstLine}</div>
                        <div className="material-list-line-2">{this.props.secondLine}</div>
                        <div className="material-list-line-3">{this.props.thirdLine}</div>
                    </div>
                    <div className="material-list-actions">
                        {this.props.actions}
                    </div>
                </div>
            );

        }
    });

    var WrappedListEntry = React.createClass({

        propTypes:{
            connectDragSource: React.PropTypes.func.isRequired,
            connectDropTarget: React.PropTypes.func.isRequired,
            isDragging: React.PropTypes.bool.isRequired,
            isOver: React.PropTypes.bool.isRequired,
            canDrop: React.PropTypes.bool.isRequired
        },

        render: function () {
            // These two props are injected by React DnD,
            // as defined by your `collect` function above:
            var isDragging = this.props.isDragging;
            var connectDragSource = this.props.connectDragSource;
            var connectDropTarget = this.props.connectDropTarget;

            return connectDragSource(connectDropTarget(
                <ListEntry {...this.props}/>
            ));
        }
    });

    var DragDropListEntry;
    if(global.ReactDND){
        var DragDropListEntry = ReactDND.flow(
            ReactDND.DragSource(Types.NODE_PROVIDER, nodeDragSource, collect),
            ReactDND.DropTarget(Types.NODE_PROVIDER, nodeDropTarget, collectDrop)
        )(WrappedListEntry);
    }else{
        DragDropListEntry = ListEntry;
    }


    var SortColumns = React.createClass({

        mixins:[MessagesConsumerMixin],

        propTypes:{
            tableKeys:React.PropTypes.object.isRequired,
            columnClicked:React.PropTypes.func,
            sortingInfo:React.PropTypes.object,
            displayMode:React.PropTypes.string
        },

        onMenuClicked: function(object){
            this.props.columnClicked(object.payload);
        },

        onHeaderClick: function(key, ev){
            let data = this.props.tableKeys[key];
            if(data && data['sortType'] && this.props.columnClicked){
                data['name'] = key;
                this.props.columnClicked(data);
            }
        },

        getColumnsItems: function(displayMode){

            let items = [];
            for(var key in this.props.tableKeys){
                if(!this.props.tableKeys.hasOwnProperty(key)) continue;
                let data = this.props.tableKeys[key];
                let style = data['width']?{width:data['width']}:null;
                let icon;
                let className = 'cell header_cell cell-' + key;
                if(data['sortType']){
                    className += ' sortable';
                    if(this.props.sortingInfo && (
                        this.props.sortingInfo.attribute === key
                        || this.props.sortingInfo.attribute === data['sortAttribute']
                        || this.props.sortingInfo.attribute === data['remoteSortAttribute'])){
                        icon = this.props.sortingInfo.direction === 'asc' ? 'mdi mdi-arrow-up' : 'mdi mdi-arrow-down';
                        className += ' active-sort-' + this.props.sortingInfo.direction;
                    }
                }
                if(displayMode === 'menu') {
                    data['name'] = key;
                    items.push({
                        payload: data,
                        text: data['label'],
                        iconClassName: icon
                    });
                }else if(displayMode === 'menu_data'){
                    items.push({
                        name: data['label'],
                        callback:this.onHeaderClick.bind(this, key),
                        icon_class:icon
                    });
                }else{
                    items.push(<span
                        key={key}
                        className={className}
                        style={style}
                        onClick={this.onHeaderClick.bind(this, key)}
                    >{data['label']}</span>);

                }
            }
            return items;

        },

        buildSortingMenuItems: function(){
            return this.getColumnsItems('menu_data');
        },

        componentDidMount: function(){

            var sortAction = new Action({
                name:'sort_action',
                icon_class:'icon-sort',
                text_id:150,
                title_id:151,
                text:MessageHash[150],
                title:MessageHash[151],
                hasAccessKey:false,
                subMenu:true,
                subMenuUpdateImage:true
            }, {
                selection:false,
                dir:true,
                actionBar:true,
                actionBarGroup:'display_toolbar',
                contextMenu:false,
                infoPanel:false
            }, {}, {}, {
                dynamicBuilder:this.buildSortingMenuItems.bind(this)
            });
            let buttons = new Map();
            buttons.set('sort_action', sortAction);
            global.pydio.getController().updateGuiActions(buttons);

        },

        componentWillUnmount: function(){
            global.pydio.getController().deleteFromGuiActions('sort_action');
        },

        render: function(){
            if(this.props.displayMode === 'menu'){
                return (
                    <Toolbars.IconButtonMenu buttonTitle="Sort by..." buttonClassName="icon-sort" menuItems={this.getColumnsItems('menu')} onMenuClicked={this.onMenuClicked}/>
                );
            }else{
                return (
                    <ReactMUI.ToolbarGroup float="left">{this.getColumnsItems('header')}</ReactMUI.ToolbarGroup>
                );
            }

        }
    });

    /**
     * Specific header for Table layout, reading metadata from node and using keys
     */
    var TableListHeader = React.createClass({

        mixins:[MessagesConsumerMixin],

        propTypes:{
            tableKeys:React.PropTypes.object.isRequired,
            loading:React.PropTypes.bool,
            reload:React.PropTypes.func,
            dm:React.PropTypes.instanceOf(PydioDataModel),
            node:React.PropTypes.instanceOf(AjxpNode),
            onHeaderClick:React.PropTypes.func,
            sortingInfo:React.PropTypes.object
        },

        render: function(){
            let headers, paginator;
            if(this.props.node.getMetadata().get("paginationData") && this.props.node.getMetadata().get("paginationData").get('total') > 1){
                paginator = <ListPaginator dataModel={this.props.dm} node={this.props.node}/>;
            }
            return (
                <ReactMUI.Toolbar className="toolbarTableHeader">
                    <SortColumns displayMode="tableHeader" {...this.props} columnClicked={this.props.onHeaderClick}/>
                    <ReactMUI.ToolbarGroup float="right">
                        {paginator}
                        <ReactMUI.FontIcon
                            key={1}
                            tooltip={this.context.getMessage('149', '')}
                            className={"icon-refresh" + (this.props.loading?" rotating":"")}
                            onClick={this.props.reload}
                        />
                        {this.props.additionalActions}
                    </ReactMUI.ToolbarGroup>
                </ReactMUI.Toolbar>
            );

        }
    });

    /**
     * Specific list entry rendered as a table row. Not a real table, CSS used.
     */
    var TableListEntry = React.createClass({

        mixins:[ListEntryNodeListenerMixin],

        propTypes:{
            node:React.PropTypes.instanceOf(AjxpNode),
            tableKeys:React.PropTypes.object.isRequired,
            renderActions:React.PropTypes.func
            // See also ListEntry nodes
        },

        render: function(){

            let actions = this.props.actions;
            if(this.props.renderActions) {
                actions = this.props.renderActions(this.props.node);
            }

            let cells = [];
            let firstKey = true;
            for(var key in this.props.tableKeys){
                if(!this.props.tableKeys.hasOwnProperty(key)) continue;

                let data = this.props.tableKeys[key];
                let style = data['width']?{width:data['width']}:null;
                let value, rawValue;
                if(data.renderCell){
                    data['name'] = key;
                    value = data.renderCell(this.props.node, data);
                }else{
                    value = this.props.node.getMetadata().get(key);
                }
                rawValue = this.props.node.getMetadata().get(key);
                let inlineEditor;
                if(this.state && this.state.inlineEdition && firstKey){
                    inlineEditor = <InlineEditor
                        node={this.props.node}
                        onClose={()=>{this.setState({inlineEdition:false})}}
                        callback={this.state.inlineEditionCallback}
                    />
                    let style = this.props.style || {};
                    style.position = 'relative';
                    this.props.style = style;
                }
                cells.push(<span key={key} className={'cell cell-' + key} title={rawValue} style={style} data-label={data['label']}>{inlineEditor}{value}</span>);
                firstKey = false;
            }

            return (
                <ListEntry
                    {...this.props}
                    iconCell={null}
                    firstLine={cells}
                    actions={actions}
                    key={'list-' + this.props.key}
                />
            );


        }

    });

    /**
     * Callback based material list entry with custom icon render, firstLine, secondLine, etc.
     */
    var ConfigurableListEntry = React.createClass({

        mixins:[ListEntryNodeListenerMixin],

        propTypes: {
            node:React.PropTypes.instanceOf(AjxpNode),
            // SEE ALSO ListEntry PROPS
            renderIcon: React.PropTypes.func,
            renderFirstLine:React.PropTypes.func,
            renderSecondLine:React.PropTypes.func,
            renderThirdLine:React.PropTypes.func,
            renderActions:React.PropTypes.func,
            style: React.PropTypes.object
        },

        render: function(){
            var icon, firstLine, secondLine, thirdLine;
            if(this.props.renderIcon) {
                icon = this.props.renderIcon(this.props.node, this.props);
            } else {
                var node = this.props.node;
                var iconClass = node.getMetadata().get("icon_class")? node.getMetadata().get("icon_class") : (node.isLeaf()?"icon-file-alt":"icon-folder-close");
                icon = <ReactMUI.FontIcon className={iconClass}/>;
            }

            if(this.props.renderFirstLine) {
                firstLine = this.props.renderFirstLine(this.props.node);
            } else {
                firstLine = this.props.node.getLabel();
            }
            if(this.state && this.state.inlineEdition){
                firstLine = (
                    <span>
                        <InlineEditor
                            node={this.props.node}
                            onClose={()=>{this.setState({inlineEdition:false})}}
                            callback={this.state.inlineEditionCallback}
                        />
                        {firstLine}
                    </span>
                );
                let style = this.props.style || {};
                style.position = 'relative';
                this.props.style = style;
            }
            if(this.props.renderSecondLine) {
                secondLine = this.props.renderSecondLine(this.props.node);
            }
            if(this.props.renderThirdLine) {
                thirdLine = this.props.renderThirdLine(this.props.node);
            }
            var actions = this.props.actions;
            if(this.props.renderActions) {
                actions = this.props.renderActions(this.props.node);
            }

            return (
                <DragDropListEntry
                    {...this.props}
                    iconCell={icon}
                    firstLine={firstLine}
                    secondLine={secondLine}
                    thirdLine={thirdLine}
                    actions={actions}
                    key={'list-' + this.props.key}
                    />
            );

        }

    });

    var InlineEditor = React.createClass({

        propTypes:{
            node: React.PropTypes.instanceOf(AjxpNode),
            callback:React.PropTypes.func,
            onClose:React.PropTypes.func,
            detached:React.PropTypes.bool
        },

        submit: function(){
            if(!this.state || !this.state.value || this.state.value === this.props.node.getLabel()){
                global.alert('Please use a different value for renaming!');
            }else{
                this.props.callback(this.state.value);
                this.props.onClose();
            }
        },

        focused: function(){
            global.pydio.UI.disableAllKeyBindings();
        },

        blurred: function(){
            global.pydio.UI.enableAllKeyBindings();
        },

        componentDidMount:function(){
            this.refs.text.focus();
        },

        catchClicks: function(e){
            e.stopPropagation();
        },

        onKeyDown: function(e){
            if(e.key === 'Enter') {
                this.submit();
            }
            e.stopPropagation();
        },

        render: function(){
            return (
                <ReactMUI.Paper className={"inline-editor" + (this.props.detached ? " detached" : "")} zDepth={2}>
                    <ReactMUI.TextField
                        ref="text"
                        defaultValue={this.props.node.getLabel()}
                        onChange={(e)=>{this.setState({value:e.target.getValue()})}}
                        onFocus={this.focused}
                        onBlur={this.blurred}
                        onClick={this.catch} onDoubleClick={this.catchClicks}
                        tabIndex="0" onKeyDown={this.onKeyDown}
                    />
                    <div className="modal-buttons">
                        <ReactMUI.FlatButton label="Cancel" onClick={this.props.onClose}/>
                        <ReactMUI.FlatButton label="Submit" onClick={this.submit}/>
                    </div>
                </ReactMUI.Paper>
            );
        }

    });

    /**
     * Main List component
     */
    var SimpleFlatList = React.createClass({

        mixins:[MessagesConsumerMixin, Toolbars.ContextMenuNodeProviderMixin],

        propTypes:{
            infiniteSliceCount:React.PropTypes.number,
            filterNodes:React.PropTypes.func,
            customToolbar:React.PropTypes.object,
            tableKeys:React.PropTypes.object,
            autoRefresh:React.PropTypes.number,
            reloadAtCursor:React.PropTypes.bool,
            heightAutoWithMax:React.PropTypes.number,
            observeNodeReload:React.PropTypes.bool,
            groupByFields:React.PropTypes.array,
            defaultGroupBy:React.PropTypes.string,

            skipParentNavigation: React.PropTypes.bool,
            skipInternalDataModel:React.PropTypes.bool,

            entryEnableSelector:React.PropTypes.func,
            entryRenderIcon:React.PropTypes.func,
            entryRenderActions:React.PropTypes.func,
            entryRenderFirstLine:React.PropTypes.func,
            entryRenderSecondLine:React.PropTypes.func,
            entryRenderThirdLine:React.PropTypes.func,
            entryHandleClicks:React.PropTypes.func,

            openEditor:React.PropTypes.func,
            openCollection:React.PropTypes.func,

            elementStyle: React.PropTypes.object,
            passScrollingStateToChildren:React.PropTypes.bool,
            elementHeight:React.PropTypes.oneOfType([
                React.PropTypes.number,
                React.PropTypes.object
            ]).isRequired

        },

        statics:{
            HEIGHT_ONE_LINE:50,
            HEIGHT_TWO_LINES:73,
            CLICK_TYPE_SIMPLE:'simple',
            CLICK_TYPE_DOUBLE:'double'
        },

        getDefaultProps:function(){
            return {infiniteSliceCount:30}
        },

        clickRow: function(gridRow){
            var node;
            if(gridRow.props){
                node = gridRow.props.data.node;
            }else{
                node = gridRow;
            }
            if(this.props.entryHandleClicks){
                this.props.entryHandleClicks(node, SimpleFlatList.CLICK_TYPE_SIMPLE);
                return;
            }
            if(node.isLeaf() && this.props.openEditor) {
                var res = this.props.openEditor(node);
                if( res === false){
                    return;
                }
                var uniqueSelection = new Map();
                uniqueSelection.set(node, true);
                this.setState({selection:uniqueSelection}, this.rebuildLoadedElements);
            } else if(!node.isLeaf()) {
                if(this.props.openCollection){
                    this.props.openCollection(node);
                }else{
                    this.props.dataModel.setSelectedNodes([node]);
                }
            }
        },

        doubleClickRow: function(gridRow){
            var node;
            if(gridRow.props){
                node = gridRow.props.data.node;
            }else{
                node = gridRow;
            }
            if(this.props.entryHandleClicks){
                this.props.entryHandleClicks(node, SimpleFlatList.CLICK_TYPE_DOUBLE);
            }
        },

        onColumnSort: function(column){

            let pagination = this.props.node.getMetadata().get('paginationData');
            if(pagination && pagination.get('total') > 1 && pagination.get('remote_order')){

                let dir = 'asc';
                if(this.props.node.getMetadata().get('paginationData').get('currentOrderDir')){
                    dir = this.props.node.getMetadata().get('paginationData').get('currentOrderDir') === 'asc' ? 'desc' : 'asc';
                }
                let orderData = new Map();
                orderData.set('order_column', column['remoteSortAttribute']?column.remoteSortAttribute:column.name);
                orderData.set('order_direction', dir);
                this.props.node.getMetadata().set("remote_order", orderData);
                this.props.dataModel.requireContextChange(this.props.node, true);

            }else{

                let att = column['sortAttribute']?column['sortAttribute']:column.name;
                let dir = 'asc';
                if(this.state && this.state.sortingInfo && this.state.sortingInfo.attribute === att){
                    dir = this.state.sortingInfo.direction === 'asc' ? 'desc' : 'asc';
                }
                this.setState({sortingInfo:{
                    attribute : att,
                    sortType  : column.sortType,
                    direction : dir
                }}, function(){
                    this.rebuildLoadedElements();
                }.bind(this));

            }

        },

        onKeyDown: function(e){
            let currentIndexStart, currentIndexEnd;
            let contextHolder = global.pydio.getContextHolder();
            const elementsPerLine = this.props.elementsPerLine || 1;
            const shiftKey = e.shiftKey;
            const key = e.key;

            if(contextHolder.isEmpty()) return;
            let downKeys = ['ArrowDown', 'ArrowRight', 'PageDown', 'End'];

            let position = (shiftKey && downKeys.indexOf(key) > -1) ? 'first' : 'last';
            let currentSelection = contextHolder.getSelectedNodes();

            let firstSelected = currentSelection[0];
            let lastSelected = currentSelection[currentSelection.length - 1];

            if(key === 'Enter'){
                this.doubleClickRow(firstSelected);
                return;
            }

            for(let i=0; i< this.indexedElements.length; i++){
                if(this.indexedElements[i].node === firstSelected) {
                    currentIndexStart = i;
                }
                if(this.indexedElements[i].node === lastSelected) {
                    currentIndexEnd = i;
                    break;
                }
            }
            let selectionIndex;
            let maxIndex = this.indexedElements.length - 1;
            let increment = (key === 'PageDown' || key === 'PageUp' ? 10 : 1);
            if(key === 'ArrowDown' || key === 'PageDown'){
                selectionIndex = Math.min(currentIndexEnd + elementsPerLine * increment, maxIndex);
            }else if(key === 'ArrowUp' || key === 'PageUp'){
                selectionIndex = Math.max(currentIndexStart - elementsPerLine * increment, 0);
            }else if(key === 'Home'){
                selectionIndex = 0;
            }else if(key === 'End'){
                selectionIndex = maxIndex;
            }
            if(elementsPerLine > 1){
                if(key === 'ArrowRight'){
                    selectionIndex = currentIndexEnd + 1;
                }else if(key === 'ArrowLeft'){
                    selectionIndex = currentIndexStart - 1;
                }
            }

            if(shiftKey && selectionIndex !== undefined){
                const min = Math.min(currentIndexStart, currentIndexEnd, selectionIndex);
                const max = Math.max(currentIndexStart, currentIndexEnd, selectionIndex);
                if(min !== max){
                    let selection = [];
                    for(let i=min; i<max+1; i++){
                        if(this.indexedElements[i]) selection.push(this.indexedElements[i].node);
                    }
                    contextHolder.setSelectedNodes(selection);
                }
            }else if(this.indexedElements[selectionIndex] && this.indexedElements[selectionIndex].node){
                contextHolder.setSelectedNodes([this.indexedElements[selectionIndex].node]);
            }

        },

        getInitialState: function(){
            this.actionsCache = {multiple:new Map()};
            if(!this.props.skipInternalDataModel){
                this.dm = new PydioDataModel();
                this.dm.setContextNode(this.props.dataModel.getContextNode());
            }else{
                this.dm = this.props.dataModel;
            }
            var state = {
                loaded: this.props.node.isLoaded(),
                loading: !this.props.node.isLoaded(),
                showSelector:false,
                elements: this.props.node.isLoaded()?this.buildElements(0, this.props.infiniteSliceCount):[],
                containerHeight:this.props.heightAutoWithMax?0:500
            };
            if(this.props.defaultGroupBy){
                state.groupBy = this.props.defaultGroupBy;
            }
            if(this.props.elementHeight instanceof Object){
                state.elementHeight = this.computeElementHeightResponsive();
            }
            state.infiniteLoadBeginBottomOffset = 200;
            return state;
        },

        componentWillReceiveProps: function(nextProps) {
            this.indexedElements = null;
            if(nextProps.filterNodes) this.props.filterNodes = nextProps.filterNodes;
            var currentLength = Math.max(this.state.elements.length, nextProps.infiniteSliceCount);
            this.setState({
                loaded: nextProps.node.isLoaded(),
                loading:!nextProps.node.isLoaded(),
                showSelector:false,
                elements:nextProps.node.isLoaded()?this.buildElements(0, currentLength, nextProps.node):[],
                infiniteLoadBeginBottomOffset:200
            });
            if(!nextProps.autoRefresh&& this.refreshInterval){
                global.clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }else if(nextProps.autoRefresh && !this.refreshInterval){
                this.refreshInterval = global.setInterval(this.reload, nextProps.autoRefresh);
            }
            this.patchInfiniteGrid(nextProps.elementsPerLine);
            if(this.props.node && nextProps.node !== this.props.node) {
                this.observeNodeChildren(this.props.node, true);
            }
        },

        observeNodeChildren: function(node, stop = false){
            if(stop && !this._childrenObserver) return;

            if(!this._childrenObserver){
                this._childrenObserver = function(){
                    this.indexedElements = null;
                    this.rebuildLoadedElements();
                }.bind(this);
            }
            if(!this._childrenActionsObserver){
                this._childrenActionsObserver = function(eventMemo){
                    if(eventMemo.type === 'prompt-rename'){
                        this.setState({inlineEditionForNode:eventMemo.child, inlineEditionCallback:eventMemo.callback});
                    }
                }.bind(this);
            }
            if(stop){
                node.stopObserving("child_added", this._childrenObserver);
                node.stopObserving("child_removed", this._childrenObserver);
                node.stopObserving("child_node_action", this._childrenActionsObserver);
            }else{
                node.observe("child_added", this._childrenObserver);
                node.observe("child_removed", this._childrenObserver);
                node.observe("child_node_action", this._childrenActionsObserver);
            }
        },

        _loadNodeIfNotLoaded: function(){
            var node = this.props.node;
            if(!node.isLoaded()){
                node.observeOnce("loaded", function(){
                    if(!this.isMounted()) return;
                    if(this.props.node === node){
                        this.observeNodeChildren(node);
                        this.setState({
                            loaded:true,
                            loading: false,
                            elements:this.buildElements(0, this.props.infiniteSliceCount)
                        });
                    }
                    if(this.props.heightAutoWithMax){
                        this.updateInfiniteContainerHeight();
                    }
                }.bind(this));
                node.load();
            }else{
                this.observeNodeChildren(node);
            }
        },

        _loadingListener: function(){
            this.observeNodeChildren(this.props.node, true);
            this.setState({loaded:false, loading:true});
            this.indexedElements = null;
        },
        _loadedListener: function(){
            var currentLength = Math.max(this.state.elements.length, this.props.infiniteSliceCount);
            this.setState({
                loading:false,
                elements:this.buildElements(0, currentLength, this.props.node)
            });
            if(this.props.heightAutoWithMax){
                this.updateInfiniteContainerHeight();
            }
            this.observeNodeChildren(this.props.node);
        },

        reload: function(){
            if(this.props.reloadAtCursor && this._currentCursor){
                this.loadStartingAtCursor();
                return;
            }
            this._loadingListener();
            this.props.node.observeOnce("loaded", this._loadedListener);
            this.props.node.reload();
        },

        loadStartingAtCursor: function(){
            this._loadingListener();
            var node = this.props.node;
            var cachedChildren = node.getChildren();
            var newChildren = [];
            node.observeOnce("loaded", function(){
                var reorderedChildren = new Map();
                newChildren.map(function(c){reorderedChildren.set(c.getPath(), c);});
                cachedChildren.forEach(function(c){reorderedChildren.set(c.getPath(), c);});
                node._children = reorderedChildren;
                this._loadedListener();
            }.bind(this));
            node.setLoaded(false);
            node.observe("child_added", function(newChild){
                newChildren.push(node._children.get(newChild));
            });
            this.props.node.load(null, {cursor:this._currentCursor});
        },

        wireReloadListeners: function(){
            this.wrappedLoading = this._loadingListener;
            this.wrappedLoaded = this._loadedListener;
            this.props.node.observe("loading", this.wrappedLoading);
            this.props.node.observe("loaded", this.wrappedLoaded);
        },
        stopReloadListeners:function(){
            this.props.node.stopObserving("loading", this.wrappedLoading);
            this.props.node.stopObserving("loaded", this.wrappedLoaded);
        },

        toggleSelector:function(){
            // Force rebuild elements
            this.setState({
                showSelector:!this.state.showSelector,
                selection:new Map()
            }, this.rebuildLoadedElements);
        },

        toggleSelection:function(node){
            var selection = this.state.selection || new Map();
            if(selection.get(node)) selection.delete(node);
            else selection.set(node, true);
            this.refs.all_selector.setChecked(false);
            this.setState({
                selection:selection
            }, this.rebuildLoadedElements);
        },

        selectAll:function(){
            if(!this.refs.all_selector.isChecked()){
                this.setState({selection:new Map()}, this.rebuildLoadedElements);
            }else{
                var selection = new Map();
                this.props.node.getChildren().forEach(function(child){
                    if(this.props.filterNodes && !this.props.filterNodes(child)){
                        return;
                    }
                    if(child.isLeaf()){
                        selection.set(child, true);
                    }
                }.bind(this));
                this.refs.all_selector.setChecked(true);
                this.setState({selection:selection}, this.rebuildLoadedElements);
            }
        },

        applyMultipleAction: function(ev){
            if(!this.state.selection || !this.state.selection.size){
                return;
            }
            var actionName = ev.currentTarget.getAttribute('data-action');
            var dm = this.dm || new PydioDataModel();
            dm.setContextNode(this.props.node);
            var selNodes = [];
            this.state.selection.forEach(function(v, node){
                selNodes.push(node);
            });
            dm.setSelectedNodes(selNodes);
            var a = global.pydio.Controller.getActionByName(actionName);
            a.fireContextChange(dm, true, global.pydio.user);
            //a.fireSelectionChange(dm);
            a.apply([dm]);

            ev.stopPropagation();
            ev.preventDefault();
        },

        getActionsForNode: function(dm, node){
            var cacheKey = node.isLeaf() ? 'file-' + node.getAjxpMime() :'folder';
            var selectionType = node.isLeaf() ? 'file' : 'dir';
            var nodeActions = [];
            if(this.actionsCache[cacheKey]) {
                nodeActions = this.actionsCache[cacheKey];
            }else{
                dm.setSelectedNodes([node]);
                global.pydio.Controller.actions.forEach(function(a){
                    a.fireContextChange(dm, true, global.pydio.user);
                    if(a.context.selection && a.context.actionBar && a.selectionContext[selectionType] && !a.deny && a.options.icon_class
                        && (!this.props.actionBarGroups || this.props.actionBarGroups.indexOf(a.context.actionBarGroup) !== -1)
                        && (!a.selectionContext.allowedMimes.length || a.selectionContext.allowedMimes.indexOf(node.getAjxpMime()) !== -1)
                    ) {
                        nodeActions.push(a);
                        if(node.isLeaf() &&  a.selectionContext.unique === false) {
                            this.actionsCache.multiple.set(a.options.name, a);
                        }
                    }
                }.bind(this));
                this.actionsCache[cacheKey] = nodeActions;
            }
            return nodeActions;
        },

        updateInfiniteContainerHeight: function(){
            var containerHeight = this.refs.infiniteParent.getDOMNode().clientHeight;
            if(this.props.heightAutoWithMax){
                var elementHeight = this.state.elementHeight?this.state.elementHeight:this.props.elementHeight;
                containerHeight = Math.min(this.props.node.getChildren().size * elementHeight ,this.props.heightAutoWithMax);
            }
            this.setState({containerHeight:containerHeight});
        },

        computeElementHeightResponsive:function(){
            var breaks = this.props.elementHeight;
            if(! (breaks instanceof Object) ){
                breaks = {
                    "min-width:480px":this.props.elementHeight,
                    "max-width:480px":(Object.keys(this.props.tableKeys).length * 24) + 33
                };
            }
            if(global.matchMedia){
                for(var k in breaks){
                    if(breaks.hasOwnProperty(k) && global.matchMedia('('+k+')').matches){
                        return breaks[k];
                    }
                }
            }else{
                var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
                if(width < 480) return breaks["max-width:480px"];
                else return breaks["max-width:480px"];
            }
            return 50;
        },

        updateElementHeightResponsive: function(){
            var newH = this.computeElementHeightResponsive();
            if(!this.state || !this.state.elementHeight || this.state.elementHeight != newH){
                this.setState({elementHeight:newH}, function(){
                    if(this.props.heightAutoWithMax){
                        this.updateInfiniteContainerHeight();
                    }
                }.bind(this));
            }
        },

        patchInfiniteGrid: function(els){
            if(this.refs.infinite && els > 1){
                this.refs.infinite.state.infiniteComputer.__proto__.getDisplayIndexStart = function (windowTop){
                    return els * Math.floor((windowTop/this.heightData) / els)
                };
                this.refs.infinite.state.infiniteComputer.__proto__.getDisplayIndexEnd = function (windowBottom){
                    return els * Math.ceil((windowBottom/this.heightData) / els)
                };
            }
        },

        componentDidMount: function(){
            this._loadNodeIfNotLoaded();
            this.patchInfiniteGrid(this.props.elementsPerLine);
            if(this.refs.infiniteParent){
                this.updateInfiniteContainerHeight();
                if(!this.props.heightAutoWithMax && !this.props.externalResize) {
                    if(global.addEventListener){
                        global.addEventListener('resize', this.updateInfiniteContainerHeight);
                    }else{
                        global.attachEvent('onresize', this.updateInfiniteContainerHeight);
                    }
                }
            }
            if(this.props.autoRefresh){
                this.refreshInterval = global.setInterval(this.reload, this.props.autoRefresh);
            }
            if(this.props.observeNodeReload){
                this.wireReloadListeners();
            }
            if(this.props.elementHeight instanceof Object || this.props.tableKeys){
                if(global.addEventListener){
                    global.addEventListener('resize', this.updateElementHeightResponsive);
                }else{
                    global.attachEvent('onresize', this.updateElementHeightResponsive);
                }
                this.updateElementHeightResponsive();
            }
            this.props.dataModel.observe('selection_changed', function(){
                let selection = new Map();
                this.props.dataModel.getSelectedNodes().map(function(n){
                    selection.set(n, true);
                });
                this.setState({selection: selection}, this.rebuildLoadedElements);
            }.bind(this));
        },

        componentWillUnmount: function(){
            if(!this.props.heightAutoWithMax) {
                if(global.removeEventListener){
                    global.removeEventListener('resize', this.updateInfiniteContainerHeight);
                }else{
                    global.detachEvent('onresize', this.updateInfiniteContainerHeight);
                }
            }
            if(this.props.elementHeight instanceof Object || this.props.tableKeys){
                if(global.removeEventListener){
                    global.removeEventListener('resize', this.updateElementHeightResponsive);
                }else{
                    global.detachEvent('resize', this.updateElementHeightResponsive);
                }
            }
            if(this.refreshInterval){
                global.clearInterval(this.refreshInterval);
            }
            if(this.props.observeNodeReload){
                this.stopReloadListeners();
            }
            if(this.props.node) {
                this.observeNodeChildren(this.props.node, true);
            }
        },

        componentDidUpdate: function(prevProps, prevState){
            if(prevProps.node && this.props.node && prevProps.node.getPath() === this.props.node.getPath()){
                return;
            }
            this._loadNodeIfNotLoaded();
        },

        onScroll:function(scrollTop){

            if(!this.props.passScrollingStateToChildren){
                return;
            }
            // Maintains a series of timeouts to set this.state.isScrolling
            // to be true when the element is scrolling.

            if (this.state.scrollTimeout) {
                clearTimeout(this.state.scrollTimeout);
            }

            var that = this,
                scrollTimeout = setTimeout(() => {
                    that.setState({
                        isScrolling: false,
                        scrollTimeout: undefined
                    })
                }, 150);

            this.setState({
                isScrolling: true,
                scrollTimeout: scrollTimeout
            });

        },

        buildElementsFromNodeEntries: function(nodeEntries, showSelector){

            var components = [];
            nodeEntries.forEach(function(entry){
                var data;
                if(entry.parent) {
                    data = {
                        node: entry.node,
                        key: entry.node.getPath(),
                        id: entry.node.getPath(),
                        mainIcon: "mdi mdi-arrow-up",
                        firstLine: "..",
                        className: "list-parent-node",
                        secondLine:this.context.getMessage('react.1'),
                        onClick: this.clickRow,
                        onDoubleClick: this.doubleClickRow,
                        showSelector: false,
                        selectorDisabled: true
                    };
                    if(this.props.elementStyle){
                        data['style'] = this.props.elementStyle;
                    }
                    if(this.props.passScrollingStateToChildren){
                        data['parentIsScrolling'] = this.state.isScrolling;
                    }
                    components.push(React.createElement(ListEntry, data));
                }else if(entry.groupHeader){
                    data = {
                        node: null,
                        key: entry.groupHeader,
                        id: entry.groupHeader,
                        mainIcon: null,
                        firstLine: entry.groupHeader,
                        className:'list-group-header',
                        onClick: null,
                        showSelector: false,
                        selectorDisabled: true
                    };
                    if(this.props.passScrollingStateToChildren){
                        data['parentIsScrolling'] = this.state.isScrolling;
                    }
                    components.push(React.createElement(ListEntry, data));
                }else{
                    data = {
                        node:entry.node,
                        onClick: this.clickRow,
                        onDoubleClick: this.doubleClickRow,
                        onSelect:this.toggleSelection,
                        key:entry.node.getPath(),
                        id:entry.node.getPath(),
                        renderIcon:this.props.entryRenderIcon,
                        renderFirstLine:this.props.entryRenderFirstLine,
                        renderSecondLine:this.props.entryRenderSecondLine,
                        renderThirdLine:this.props.entryRenderThirdLine,
                        renderActions:this.props.entryRenderActions,
                        showSelector:showSelector,
                        selected:(this.state && this.state.selection)?this.state.selection.get(entry.node):false,
                        actions:<SimpleReactActionBar node={entry.node} actions={entry.actions} dataModel={this.dm}/>,
                        selectorDisabled:!(this.props.entryEnableSelector?this.props.entryEnableSelector(entry.node):entry.node.isLeaf())
                    };
                    if(this.props.elementStyle){
                        data['style'] = this.props.elementStyle;
                    }
                    if(this.props.passScrollingStateToChildren){
                        data['parentIsScrolling'] = this.state.isScrolling;
                    }
                    if(this.props.tableKeys){
                        if(this.state && this.state.groupBy){
                            data['tableKeys'] = LangUtils.deepCopy(this.props.tableKeys);
                            delete data['tableKeys'][this.state.groupBy];
                        }else{
                            data['tableKeys'] = this.props.tableKeys;
                        }
                        components.push(React.createElement(TableListEntry, data));
                    }else{
                        components.push(React.createElement(ConfigurableListEntry, data));
                    }
                }
            }.bind(this));
            return components;

        },

        buildElements: function(start, end, node, showSelector){
            var theNode = this.props.node;
            if (node) theNode = node;
            var theShowSelector = this.state && this.state.showSelector;
            if(showSelector !== undefined) theShowSelector = showSelector;

            if(!this.indexedElements) {
                this.indexedElements = [];
                if(this.state && this.state.groupBy){
                    var groupBy = this.state.groupBy;
                    var groups = {};
                    var groupKeys = [];
                }

                if (!this.props.skipParentNavigation && theNode.getParent()
                    && (this.props.dataModel.getContextNode() !== theNode || this.props.skipInternalDataModel)) {
                    this.indexedElements.push({node: theNode.getParent(), parent: true, actions: null});
                }

                theNode.getChildren().forEach(function (child) {
                    if(child.getMetadata().has('cursor')){
                        var childCursor = parseInt(child.getMetadata().get('cursor'));
                        this._currentCursor = Math.max((this._currentCursor ? this._currentCursor : 0), childCursor);
                    }
                    if(this.props.filterNodes && !this.props.filterNodes(child)){
                        return;
                    }
                    var nodeActions = this.getActionsForNode(this.dm, child);
                    if(groupBy){
                        var groupValue = child.getMetadata().get(groupBy) || 'N/A';
                        if(!groups[groupValue]) {
                            groups[groupValue] = [];
                            groupKeys.push(groupValue);
                        }
                        groups[groupValue].push({node: child, parent: false, actions: nodeActions});
                    }else{
                        this.indexedElements.push({node: child, parent: false, actions: nodeActions});
                    }
                }.bind(this));

                if(groupBy){
                    groupKeys = groupKeys.sort();
                    groupKeys.map(function(k){
                        this.indexedElements.push({node: null, groupHeader:k, parent: false, actions: null});
                        this.indexedElements = this.indexedElements.concat(groups[k]);
                    }.bind(this));
                }

            }

            if(this.state && this.state.sortingInfo && !this.remoteSortingInfo()){
                let sortingInfo = this.state.sortingInfo;
                let sortingMeta = sortingInfo.attribute;
                let sortingDirection = sortingInfo.direction;
                let sortingType = sortingInfo.sortType;
                this.indexedElements.sort(function(a, b){
                    let aMeta = a.node.getMetadata().get(sortingMeta) || "";
                    let bMeta = b.node.getMetadata().get(sortingMeta) || "";
                    let res;
                    if(sortingType === 'number'){
                        aMeta = parseFloat(aMeta);
                        bMeta = parseFloat(bMeta);
                        res  = (sortingDirection === 'asc' ? aMeta - bMeta : bMeta - aMeta);
                    }else if(sortingType === 'string'){
                        res = (sortingDirection === 'asc'? aMeta.localeCompare(bMeta) : bMeta.localeCompare(aMeta));
                    }
                    if(res === 0){
                        // Resort by label to make it stable
                        let labComp = a.node.getLabel().localeCompare(b.node.getLabel());
                        res = (sortingDirection === 'asc' ? labComp : -labComp);
                    }
                    return res;
                });
            }

            if(this.props.elementPerLine > 1){
                end = end * this.props.elementPerLine;
                start = start * this.props.elementPerLine;
            }
            var nodes = this.indexedElements.slice(start, end);
            if(!nodes.length && theNode.getMetadata().get('paginationData')){
                /*
                //INFINITE SCROLLING ACCROSS PAGE. NOT SURE IT'S REALLY UX FRIENDLY FOR BIG LISTS OF USERS.
                //BUT COULD BE FOR E.G. LOGS
                var pData = theNode.getMetadata().get('paginationData');
                var total = parseInt(pData.get("total"));
                var current = parseInt(pData.get("current"));
                if(current < total){
                    pData.set("new_page", current+1);
                }
                this.dm.requireContextChange(theNode);
                */
                return [];
            }else{
                return nodes; //this.buildElementsFromNodeEntries(nodes, theShowSelector);
            }
        },

        rebuildLoadedElements: function(){
            let newElements = this.buildElements(0, Math.max(this.state.elements.length, this.props.infiniteSliceCount));
            let infiniteLoadBeginBottomOffset = newElements.length? 200 : 0;
            this.setState({
                elements:newElements,
                infiniteLoadBeginBottomOffset:infiniteLoadBeginBottomOffset
            });
            this.updateInfiniteContainerHeight();
        },

        handleInfiniteLoad: function() {
            let elemLength = this.state.elements.length;
            let newElements = this.buildElements(elemLength, elemLength + this.props.infiniteSliceCount);
            let infiniteLoadBeginBottomOffset = newElements.length? 200 : 0;
            this.setState({
                isInfiniteLoading: false,
                elements: this.state.elements.concat(newElements),
                infiniteLoadBeginBottomOffset:infiniteLoadBeginBottomOffset
            });
        },

        /**
         * Extract remote sorting info from current node metadata
         */
        remoteSortingInfo: function(){
            let meta = this.props.node.getMetadata().get('paginationData');
            if(meta && meta.get('total') > 1 && meta.has('remote_order')){
                let col = meta.get('currentOrderCol');
                let dir = meta.get('currentOrderDir');
                if(col && dir){
                    return {
                        remote: true,
                        attribute: col,
                        direction:dir
                    };
                }
            }
            return null;
        },

        renderToolbar: function(){

            var rightButtons = [<ReactMUI.FontIcon
                key={1}
                        tooltip="Reload"
                        className={"icon-refresh" + (this.state.loading?" rotating":"")}
                        onClick={this.reload}
            />];
            if(this.props.sortKeys){

                let sortingInfo, remoteSortingInfo = this.remoteSortingInfo();
                if(remoteSortingInfo){
                    sortingInfo = remoteSortingInfo;
                }else{
                    sortingInfo = this.state?this.state.sortingInfo:null;
                }
                rightButtons.push(<SortColumns
                    displayMode="menu"
                    tableKeys={this.props.sortKeys}
                    columnClicked={this.onColumnSort}
                    sortingInfo={sortingInfo}
                />);
            }
            if(this.props.additionalActions){
                rightButtons.push(this.props.additionalActions);
            }

            var leftToolbar;
            var paginator;
            if(this.props.node.getMetadata().get("paginationData") && this.props.node.getMetadata().get("paginationData").get('total') > 1){
                paginator = (
                    <ListPaginator dataModel={this.dm} node={this.props.node}/>
                );
            }

            if(this.props.listTitle){
                leftToolbar =(
                    <ReactMUI.ToolbarGroup key={0} float="left">
                        <div className="list-title">{this.props.listTitle}</div>
                    </ReactMUI.ToolbarGroup>
                );
            }

            if(this.props.searchResultData){

                leftToolbar =(
                    <ReactMUI.ToolbarGroup key={0} float="left">
                        <h2 className="search-results-title">{this.context.getMessage('react.3').replace('%s', this.props.searchResultData.term)}</h2>
                    </ReactMUI.ToolbarGroup>
                );
                rightButtons = <ReactMUI.RaisedButton key={1} label={this.context.getMessage('react.4')} primary={true} onClick={this.props.searchResultData.toggleState} />;

            }else if(this.actionsCache.multiple.size){
                var bulkLabel = this.context.getMessage('react.2');
                if(this.state.selection && this.state.showSelector){
                    bulkLabel +=" (" + this.state.selection.size + ")";
                }
                leftToolbar = (
                    <ReactMUI.ToolbarGroup key={0} float="left" className="hide-on-vertical-layout">
                        <ReactMUI.Checkbox ref="all_selector" onClick={this.selectAll}/>
                        <ReactMUI.FlatButton label={bulkLabel} onClick={this.toggleSelector} />
                    </ReactMUI.ToolbarGroup>
                );

                if(this.state.showSelector) {
                    rightButtons = [];
                    var index = 0;
                    this.actionsCache.multiple.forEach(function(a){
                        rightButtons.push(<ReactMUI.RaisedButton
                                key={index}
                                label={a.options.text}
                                data-action={a.options.name}
                                onClick={this.applyMultipleAction}
                                primary={true}/>
                        );
                    }.bind(this));
                    rightButtons = (<span>{rightButtons}</span>);

                }

            }

            return (
                <ReactMUI.Toolbar>
                    {leftToolbar}
                    <ReactMUI.ToolbarGroup key={1} float="right">
                        {paginator}
                        {rightButtons}
                    </ReactMUI.ToolbarGroup>
                </ReactMUI.Toolbar>
            );

        },

        render: function(){

            var containerClasses = "material-list vertical-layout layout-fill";
            if(this.props.className){
                containerClasses += " " + this.props.className;
            }
            if(this.state.showSelector) {
                containerClasses += " list-show-selectors";
            }
            if(this.props.tableKeys){
                containerClasses += " table-mode";
            }
            var toolbar;
            if(this.props.tableKeys){
                var tableKeys;
                if(this.state && this.state.groupBy){
                    tableKeys = LangUtils.deepCopy(this.props.tableKeys);
                    delete tableKeys[this.state.groupBy];
                }else{
                    tableKeys = this.props.tableKeys;
                }
                let sortingInfo, remoteSortingInfo = this.remoteSortingInfo();
                if(remoteSortingInfo){
                    sortingInfo = remoteSortingInfo;
                }else{
                    sortingInfo = this.state?this.state.sortingInfo:null;
                }
                toolbar = <TableListHeader
                    tableKeys={tableKeys}
                    loading={this.state.loading}
                    reload={this.reload}
                    ref="loading_indicator"
                    dm={this.props.dataModel}
                    node={this.props.node}
                    additionalActions={this.props.additionalActions}
                    onHeaderClick={this.onColumnSort}
                    sortingInfo={sortingInfo}
                />
            }else{
                toolbar = this.props.customToolbar ? this.props.customToolbar : this.renderToolbar();
            }
            let inlineEditor;
            if(this.state.inlineEditionForNode){
                inlineEditor = <InlineEditor
                    detached={true}
                    node={this.state.inlineEditionForNode}
                    callback={this.state.inlineEditionCallback}
                    onClose={()=>{this.setState({inlineEditionForNode:null});}}
                />
            }

            var elements = this.buildElementsFromNodeEntries(this.state.elements, this.state.showSelector);
            return (
                <div className={containerClasses} onContextMenu={this.contextMenuResponder} tabIndex="0" onKeyDown={this.onKeyDown}>
                    {toolbar}
                    {inlineEditor}
                    <div className={this.props.heightAutoWithMax?"infinite-parent-smooth-height":"layout-fill"} ref="infiniteParent">
                        <Infinite
                            elementHeight={this.state.elementHeight?this.state.elementHeight:this.props.elementHeight}
                            containerHeight={this.state.containerHeight}
                            infiniteLoadBeginBottomOffset={this.state.infiniteLoadBeginBottomOffset}
                            onInfiniteLoad={this.handleInfiniteLoad}
                            handleScroll={this.onScroll}
                            ref="infinite"
                        >
                            {elements}
                        </Infinite>
                    </div>
                </div>
            );
        }

    });

    /**
     * Simple to use list component encapsulated with its own query mechanism
     * using a set of properties for the remote node provider.
     */
    var NodeListCustomProvider = React.createClass({

        propTypes:{
            nodeProviderProperties:React.PropTypes.object,
            presetDataModel:React.PropTypes.instanceOf(PydioDataModel),
            autoRefresh:React.PropTypes.number,
            actionBarGroups:React.PropTypes.array,
            heightAutoWithMax:React.PropTypes.number,
            elementHeight:React.PropTypes.number.isRequired,
            nodeClicked:React.PropTypes.func,
            reloadOnServerMessage:React.PropTypes.string
        },

        reload: function(){
            if(this.refs.list && this.isMounted()){
                this.refs.list.reload();
            }
        },

        componentWillUnmount:function(){
            if(this._smObs){
                this.props.pydio.stopObserving("server_message", this._smObs);
                this.props.pydio.stopObserving("server_message:" + this.props.reloadOnServerMessage, this.reload);
            }
        },

        getInitialState:function(){

            var dataModel, rootNode;
            if(this.props.presetDataModel){
                dataModel = this.props.presetDataModel;
                rootNode = dataModel.getRootNode();
            }else{
                dataModel = new PydioDataModel(true);
                var rNodeProvider = new RemoteNodeProvider();
                dataModel.setAjxpNodeProvider(rNodeProvider);
                rNodeProvider.initProvider(this.props.nodeProviderProperties);
                rootNode = new AjxpNode("/", false, "loading", "folder.png", rNodeProvider);
                dataModel.setRootNode(rootNode);
            }
            if(this.props.nodeClicked){
                // leaf
                this.openEditor = function(node){
                    this.props.nodeClicked(node);
                    return false;
                }.bind(this);
                // dir
                dataModel.observe("selection_changed", function(event){
                    var selectedNodes = event.memo.getSelectedNodes();
                    if(selectedNodes.length) {
                        this.props.nodeClicked(selectedNodes[0]);
                        event.memo.setSelectedNodes([]);
                    }
                }.bind(this));
            }
            if(this.props.reloadOnServerMessage && this.props.pydio){
                this._smObs = function(event){ if(XMLUtils.XPathSelectSingleNode(event, this.props.reloadOnServerMessage)) this.reload(); }.bind(this);
                this.props.pydio.observe("server_message", this._smObs);
                this.props.pydio.observe("server_message:" + this.props.reloadOnServerMessage, this.reload);
            }
            return {node:rootNode, dataModel:dataModel};
        },

        render:function(){
            var legend;
            if(this.props.legend){
                legend = <div className="subtitle">{this.props.legend}</div>;
            }
            return (
                <div className={this.props.heightAutoWithMax?"":"layout-fill vertical-layout"}>
                    <ReactPydio.SimpleList
                        {...this.props}
                        openEditor={this.openEditor}
                        ref="list"
                        style={{height:'100%'}}
                        node={this.state.node}
                        dataModel={this.state.dataModel}
                        actionBarGroups={this.props.actionBarGroups}
                        skipParentNavigation={true}
                        observeNodeReload={true}
                    />
                </div>
            );
        }

    });


    /********************/
    /* ASYNC COMPONENTS */
    /********************/
    /**
     * Load a component from server (if not already loaded) based on its namespace.
     */
    var AsyncComponent = React.createClass({

        propTypes: {
            namespace:React.PropTypes.string.isRequired,
            componentName:React.PropTypes.string.isRequired
        },

        _asyncLoad:function(){
            ResourcesManager.loadClassesAndApply([this.props.namespace], function(){
                this.setState({loaded:true});
                if(this.refs['component'] && this.props.onLoad && !this.loadFired){
                    this.props.onLoad(this.refs['component']);
                    this.loadFired = true;
                }
            }.bind(this));
        },

        componentDidMount: function(){
            this._asyncLoad();
        },

        componentWillReceiveProps:function(newProps){
            if(this.props.namespace != newProps.namespace){
                this.loadFired = false;
                this.setState({loaded:false});
            }
        },

        componentDidUpdate:function(){
            if(!this.state.loaded){
                this._asyncLoad();
            }else{
                if(this.refs['component'] && this.props.onLoad && !this.loadFired){
                    this.props.onLoad(this.refs['component']);
                    this.loadFired = true;
                }
            }
        },

        getInitialState: function(){
            return {loaded: false};
        },

        getComponent:function(){
            return (this.refs.component ? this.refs.component : null);
        },

        render: function(){
            if(this.state && this.state.loaded){
                var nsObject = global[this.props.namespace];
                if(nsObject && nsObject[this.props.componentName]){
                    var props = LangUtils.simpleCopy(this.props);
                    props['ref'] = 'component';
                    return React.createElement(nsObject[this.props.componentName], props, null);
                }else{
                    return <div>Component {this.props.namespace}.{this.props.componentName} not found!</div>;
                }
            }else{
                return <div>Loading ...</div>;
            }
        }

    });
    /**
     * Specific AsyncComponent for Modal Dialog
     */
    var AsyncModal = React.createClass({

        getInitialState:function(){
            return {
                async:true,
                componentData:null,
                actions:[
                    { text: 'Cancel', ref: 'cancel' },
                    { text: 'Submit', ref: 'submit' }
                ],
                title:null
            }
        },

        componentWillReceiveProps: function(nextProps){
            var componentData = nextProps.componentData;
            var state = {componentData:componentData, async:true};
            if(componentData && (!componentData instanceof Object || !componentData['namespace'])){
                state['async'] = false;
                this.initModalFromComponent(componentData);
            }
            this.setState(state);
        },

        show: function(){
            if(this.refs.dialog) this.refs.dialog.show();
        },

        hide:function(){
            this.refs.dialog.dismiss();
        },

        onActionsUpdate:function(component){
            if(component.getButtons){
                this.setState({actions:component.getButtons()});
            }
        },

        onTitleUpdate:function(component){
            if(component.getTitle){
                this.setState({title:component.getTitle()});
            }
        },

        onDialogClassNameUpdate:function(component){
            if(component.getDialogClassName){
                this.setState({className:component.getDialogClassName()});
            }
        },

        initModalFromComponent:function(component){
            if(component.getButtons){
                this.setState({actions:component.getButtons()});
            }
            if(component.getTitle){
                this.setState({title:component.getTitle()});
            }
            if(component.getDialogClassName){
                this.setState({className:component.getDialogClassName()});
            }
            if(component.setModal){
                component.setModal(this);
            }
        },

        render: function(){
            var modalContent;
            if(this.state.componentData){
                if(this.state.async){
                    modalContent = (
                        <ReactPydio.AsyncComponent
                            {...this.props}
                            namespace={this.state.componentData.namespace}
                            componentName={this.state.componentData.compName}
                            ref="modalAsync"
                            onLoad={this.initModalFromComponent}
                            dismiss={this.hide}
                            actionsUpdated={this.onActionsUpdate}
                            titleUpdated={this.onTitleUpdate}
                            classNameUpdated={this.onDialogClassNameUpdate}
                            modalData={{modal:this, payload: this.state.componentData['payload']}}
                        />
                    );
                }else{
                    modalContent = this.state.componentData;
                }
            }
            return (
                <ReactMUI.Dialog
                    ref="dialog"
                    title={this.state.title}
                    actions={this.state.actions}
                    actionFocus="submit"
                    modal={false}
                    className={this.state.className}
                    dismissOnClickAway={true}
                    onShow={this.props.onShow}
                    onDismiss={this.props.onDismiss}
                    contentClassName={this.state.className}
                >{modalContent}</ReactMUI.Dialog>
            );
        }

    });

    var ReactPydio = global.ReactPydio || {};

    ReactPydio.MessagesConsumerMixin = MessagesConsumerMixin;

    ReactPydio.SortableList = SortableList;
    ReactPydio.SimpleList = SimpleFlatList;
    ReactPydio.NodeListCustomProvider = NodeListCustomProvider;
    ReactPydio.ListEntry = ListEntry;

    ReactPydio.SimpleFigureBadge = SimpleFigureBadge;
    ReactPydio.SimpleTree = SimpleTree;
    ReactPydio.SearchBox = SearchBox;

    ReactPydio.ReactEditorOpener = ReactEditorOpener;
    ReactPydio.LegacyUIWrapper = LegacyUIWrapper;
    ReactPydio.PaperEditorLayout = PaperEditorLayout;
    ReactPydio.PaperEditorNavEntry = PaperEditorNavEntry;
    ReactPydio.PaperEditorNavHeader = PaperEditorNavHeader;

    ReactPydio.AsyncComponent = AsyncComponent;
    ReactPydio.AsyncModal = AsyncModal;

    ReactPydio.LabelWithTip = LabelWithTip;

    global.ReactPydio = ReactPydio;

})(window);

});
