export function handleError(error, description='') {
    if (error.status == 403) {
        window.location.replace(`${location.origin}/forbidden`);
    } else {
        if (description)
            alert(`${description}: ${error.status} ${error.statusText}`);
        else
            alert(`${error.status} ${error.statusText}`);
    }
}