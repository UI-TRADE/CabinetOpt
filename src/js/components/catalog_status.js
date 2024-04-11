const updateProductsStatusStyle = () => {
    const statusFields = document.querySelectorAll('div[name="product-status"]');
    statusFields.forEach((statusField) => {
        const data = JSON.parse(statusField.getAttribute('data-json'));
        if (!data) return;
        if (data.status === "hit")     statusField.className += ' product-item__status-hit';
        if (data.status === "sale")    statusField.className += ' product-item__status-sale';
        if (data.status === "novelty") statusField.className += ' product-item__status-new';
    });
}

export default updateProductsStatusStyle