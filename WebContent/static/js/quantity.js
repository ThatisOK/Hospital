/*
 * 数量控制组件 
 * 创建者 : 本相 9169775@qq.com (2015.07.03)
 */

(function ($, noop) {

    function Quantity() {
        this.minbuy = 1; //最小购买量
        this.maxbuy = 99; //最大购买量
        this.stock = 99; //存量
        this.tuple = 1; //倍数购买

        this.no = 1; //当前选中的数量
        this.tupleMaxbuy = 99; //倍数最大购买量
        this.tupleMinbuy = 1; //倍数最小购买量

        this.addBtn = null; //加按钮
        this.cutBtn = null; //减按钮
        this.numBox = null; //数量div
        this.msgBox = null; //消息div

        this.before = noop; //点击之前回调
        this.callback = noop; //点击之后回调
    }

    //初始化
    Quantity.prototype.init = function (opt) {
        var _this = this,
            doc = $(document);

        _this.addBtn = doc.find(opt.addBtn);
        _this.cutBtn = doc.find(opt.cutBtn);
        _this.numBox = doc.find(opt.numBox);
        _this.msgBox = doc.find(opt.msgBox);
        _this.before = opt.before || _this.before;
        _this.callback = opt.callback || _this.callback;

        _this.evt();
    };

    //绑定事件
    Quantity.prototype.evt = function () {
        var _this = this,
            timer;
        _this.addBtn
            .on('click', function () {
                _this.add();
            })
            .on('mousedown', function () {
                timer = setInterval(function () {
                    _this.add();
                }, 100);
            })
            .on('mouseup', function () {
                clearInterval(timer);
            });

        _this.cutBtn
            .on('click', function () {
                _this.cut();
            })
            .on('mousedown', function () {
                timer = setInterval(function () {
                    _this.cut();
                }, 100);
            })
            .on('mouseup', function () {
                clearInterval(timer);
            });
    }

    //加动作
    Quantity.prototype.add = function () {
        this.before.call(this, this.no);
        var no = this.no + this.tuple;
        if (no <= this.tupleMaxbuy) {
            this.no = no;
            this.numBox.text(this.no);
            this.callback.call(this, this.no);
        }
        this.btnStyle();
        this.msgCtrl();
    };

    //减动作
    Quantity.prototype.cut = function () {
        this.before.call(this, this.no);
        var no = this.no - this.tuple;
        if (no >= this.tupleMinbuy) {
            this.no = no;
            this.numBox.text(this.no);
            this.callback.call(this, this.no);
        }
        this.btnStyle();
        this.msgCtrl();
    };

    //控制按钮样式
    Quantity.prototype.btnStyle = function () {

        if (this.no <= this.tupleMinbuy) {
            this.cutBtn.addClass('num-lose');
        } else {
            this.cutBtn.removeClass('num-lose');
        }
        if (this.no >= this.tupleMaxbuy) {
            this.addBtn.addClass('num-lose');
        } else {
            this.addBtn.removeClass('num-lose');
        }
    };

    //消息控制
    Quantity.prototype.msgCtrl = function () {



        this.msgBox.empty();
        if (this.no >= this.tupleMaxbuy) {
            console.log(this.msgBox);
            this.msgBox.text('本商品最多可购买：' + this.tupleMaxbuy + '件');
        }

        if (this.tuple > 1 && this.no <= this.tupleMinbuy) {
            this.msgBox.text('本商品最少买数为：' + this.tupleMinbuy + '件');
        }
    }

    /**
     * 设置最小购买量
     * @param {Number} n 最小购买量
     */
    Quantity.prototype.setMinbuy = function (n) {
        this.minbuy = Number(n);
        this.reinit();
    };

    /**
     * 设置最大购买量
     * @param {Number} n 最大购买量
     */
    Quantity.prototype.setMaxbuy = function (n) {
        this.maxbuy = Number(n);
        this.reinit();
    };

    /**
     * 设置库存
     * @param {Number} n 库存
     */
    Quantity.prototype.setStock = function (n) {
        this.stock = Number(n);
        this.reinit();
    };

    /**
     * 设置倍数购买
     * @param {Number} n 倍数
     */
    Quantity.prototype.setTuple = function (n) {
        this.tuple = n;
        this.reinit();
    }

    //加了倍数后的最大购买数和最小购买数
    Quantity.prototype.setTupleMaxMin = function () {
        this.tupleMaxbuy = Math.floor(Math.min(this.maxbuy, this.stock) / this.tuple) * this.tuple;
        this.tupleMinbuy = Math.max(Math.ceil(this.minbuy / this.tuple) * this.tuple, this.tuple);
    };

    //设置值后，刷新状态
    Quantity.prototype.reinit = function () {
        this.setTupleMaxMin(); //设置真实的最大值和最小值
        this.no = this.tupleMinbuy;
        this.numBox.text(this.tupleMinbuy);
        this.btnStyle();
        this.callback.call(this, this.no);
    }

    $.fn.quantity = function (opt) {
        var quantity = new Quantity();
        quantity.init(opt);
        return quantity;
    };

}(jQuery, function () {}));