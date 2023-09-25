class Cart {
    constructor() {
        this.products = {}
    }

    add(products){
        if(!Array.isArray(products)){
            products = [products]
        }
        products.forEach((product) => {
            this.products[product.productId + "_" + product.size] = product;
        });

        $(document).trigger("cart.updated", this.products)
    }

    update(product){
        this.add(product);
    }

    remove(productId, product_size) {
        delete this.products[productId + '_' + product_size];
        $(document).trigger("cart.updated", this.products)
    }


}

export default Cart