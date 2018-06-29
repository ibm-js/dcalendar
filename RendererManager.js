define([
	"dcl/dcl",
	"dojo/_base/html",
	"dojo/dom-style",
	"decor/Evented"
], function (
	dcl,
	html,
	domStyle,
	Evented
) {
	return dcl(Evented, {
		// summary:
		//		Factory for creating and caching released item renderers (LabelRenderer, VerticalRenderer, etc.)

		// owner: Object
		//	The owner of the store manager: a view or a calendar widget.
		owner: null,

		// rendererPool: [protected] Array
		//		The stack of recycled renderers available.
		rendererPool: null,

		// rendererList: [protected] Array
		//		The list of used renderers
		rendererList: null,

		// itemToRenderer: [protected] Object
		//		The associated array item to renderer list.
		itemToRenderer: null,

		constructor: function (/*Object*/ args) {
			this.rendererPool = {};
			this.rendererList = [];
			this.itemToRenderer = {};

			if (args) {
				for (var key in args) {
					this[key] = args[key];
				}
			}
		},

		destroy: function () {
			while (this.rendererList.length > 0) {
				this.destroyRenderer(this.rendererList.pop());
			}
			for (var kind in this.rendererPool) {
				var pool = this.rendererPool[kind];
				if (pool) {
					while (pool.length > 0) {
						this.destroyRenderer(pool.pop());
					}
				}
			}
		},

		recycleItemRenderers: function () {
			// summary:
			//		Recycles all the item renderers.
			// tags:
			//		protected

			while (this.rendererList.length > 0) {
				var ir = this.rendererList.pop();
				this.recycleRenderer(ir);
			}
			this.itemToRenderer = {};
		},

		getRenderers: function (item) {
			// summary:
			//		Returns the renderers that are currently used to display the specified item.
			//		Returns an array of objects that contains two properties:
			//		- container: The DOM node that contains the renderer.
			//		- renderer: The dcalendar/_RendererMixin instance.
			//		Do not keep references on the renderers are they are recycled and reused for other items.
			// item: Object
			//		The data or render item.
			// returns: Object[]

			if (item == null || item.id == null) {
				return null;
			}
			var list = this.itemToRenderer[item.id];
			return list == null ? null : list.concat();
		},

		createRenderer: function (item, kind, RendererClass) {
			// summary:
			//		Creates an item renderer of the specified kind.
			//		A renderer is an object with the "container" and "instance" properties.
			// item: Object
			//		The data item.
			// kind: String
			//		The kind of renderer.
			// RendererClass: Object
			//		The class to instantiate to create the renderer.
			// returns: Object
			// tags:
			//		protected

			if (item != null && kind != null && RendererClass != null) {

				var res = null, renderer = null;

				var pool = this.rendererPool[kind];

				if (pool != null) {
					res = pool.shift();
				}

				if (res == null) {
					renderer = new RendererClass();

					res = {
						renderer: renderer,
						container: renderer,
						kind: kind
					};

					this.emit("renderer-created", {renderer: res, source: this.owner, item: item});
				} else {
					renderer = res.renderer;

					this.emit("renderer-reused", {renderer: renderer, source: this.owner, item: item});
				}

				renderer.owner = this.owner;
				renderer.rendererKind = kind;
				renderer.item = item;

				var list = this.itemToRenderer[item.id];
				if (list == null) {
					this.itemToRenderer[item.id] = list = [];
				}
				list.push(res);

				this.rendererList.push(res);
				return res;
			}
			return null;
		},

		recycleRenderer: function (renderer) {
			// summary:
			//		Recycles the item renderer to be reused in the future.
			// renderer: dcalendar/_RendererMixin
			//		The item renderer to recycle.
			// tags:
			//		protected

			this.emit("renderer-recycled", {renderer: renderer, source: this.owner});

			var pool = this.rendererPool[renderer.kind];

			if (pool == null) {
				this.rendererPool[renderer.kind] = [renderer];
			} else {
				pool.push(renderer);
			}

			renderer.container.parentNode.removeChild(renderer.container);

			renderer.renderer.owner = null;
			renderer.renderer.item = null;
		},

		destroyRenderer: function (renderer) {
			// summary:
			//		Destroys the item renderer.
			// renderer: dcalendar/_RendererMixin
			//		The item renderer to destroy.
			// tags:
			//		protected

			this.emit("renderer-destroyed", {renderer: renderer, source: this.owner});

			var ir = renderer.renderer;

			if (ir.destroy) {
				ir.destroy();
			}

			html.destroy(renderer.container);
		},

		destroyRenderersByKind: function (kind) {
			// tags:
			//		private

			var list = [];
			for (var i = 0; i < this.rendererList.length; i++) {
				var ir = this.rendererList[i];
				if (ir.kind == kind) {
					this.destroyRenderer(ir);
				} else {
					list.push(ir);
				}
			}

			this.rendererList = list;

			var pool = this.rendererPool[kind];
			if (pool) {
				while (pool.length > 0) {
					this.destroyRenderer(pool.pop());
				}
			}
		}
	});
});
