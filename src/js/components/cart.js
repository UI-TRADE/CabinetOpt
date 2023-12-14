import {decimalFormat} from "../utils/money_format";

class Cart {
    constructor() {
        this.products = {}
        this.miniCartElement = $("#cart-container");
        this.onReady = this.init()
        this.onReady
            .then(() => {
                $(document).trigger("cart.update", this);
            })

        $(document).on("cart.updated", () => {
            this.updateHtmlMiniCart()
        });

        $(document).data("cart", this)
    }

    init(){
        return this.request()
    }

    request() {
        return $.ajax({
            url: "/cart/info",
            method: "GET",
            success: (response) => {
                this.add(response)
                return response
            }
        })
    }

    add(products){
        if(!Array.isArray(products)){
            products = [products]
        }
        this.products = products.reduce((result,product) => {
            result[product.product_id + "_" + product.size] = product;
            return result
        }, {});

        $(document).trigger("cart.updated", this.products)
    }

    update(product){
        this.add(product);
    }

    updateItem(product){
        this.products[product.product_id + '_' + product.size] = product
        $(document).trigger("cart.updated", this.products)
    }

    remove(productId, product_size) {
        delete this.products[productId + '_' + product_size];
        $(document).trigger("cart.updated", this.products)
    }

    getProducts(){
        // need return promise cache ajax request
        return this.request().then(() => {
            return this.products
        })
    }

    updateHtmlMiniCart(){
        this.totalWeight = 0;
        this.totalPrice = 0;

        Object.values(this.products).forEach((item) => {
            this.totalPrice += item.sum // item.price * item.quntity
            this.totalWeight += item.quantity * item.weight
        })
        $(".cart-total-sum", this.miniCartElement).html(`${decimalFormat(Math.ceil(this.totalPrice))}`)
        $(".cart-total-weight", this.miniCartElement).html(`/ ${decimalFormat(this.totalWeight)} гр`)

    }


}

export default Cart