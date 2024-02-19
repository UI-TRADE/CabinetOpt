function lazyLoads() {

    // Select all elements with the "lazy" class, which are images intended for lazy loading.
    const lazyImages = document.querySelectorAll(".lazy");

    // Define the lazyLoad function, which checks if lazy images are in the viewport and loads them.
    const lazyLoad = function () {
    lazyImages.forEach((img) => {
        // Check if the top and bottom of the image are in the viewport and if the image is visible.
        if (img.getBoundingClientRect().top <= window.innerHeight && img.getBoundingClientRect().bottom >= 0 && getComputedStyle(img).display !== "none") {
        // If the conditions are met, set the image's src attribute to the value stored in its data-src attribute.
        img.src = img.dataset.src;
        // Remove the "lazy" class to mark the image as loaded.
        img.classList.remove("lazy");
        }
    });
    };

    // Initially run the lazyLoad function to load images visible on page load.
    lazyLoad();

    // Add event listeners to call the lazyLoad function when the page is scrolled, resized, or the orientation changes.
    document.addEventListener("scroll", lazyLoad);
    window.addEventListener("resize", lazyLoad);
    window.addEventListener("orientationchange", lazyLoad);

}

export function documentLoadsEvents() {
    document.addEventListener("DOMContentLoaded", () => {
        
        lazyLoads();

    });
}

export default lazyLoads;
