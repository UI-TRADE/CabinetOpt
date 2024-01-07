function weightFormat(weight, num=2) {
    const result = weight.toFixed(num).toString().split('.');
    return result.join(',');
}

export { weightFormat }