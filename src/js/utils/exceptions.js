export function handleError(error, description='') {
    if (description)
        alert(`${description}: ${error.status} ${error.statusText}`);
    else
        alert(`${error.status} ${error.statusText}`);
}