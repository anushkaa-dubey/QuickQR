// Testimonials expansion functionality
document.addEventListener("DOMContentLoaded", () => {
    const seeMoreBtn = document.getElementById("see-more-btn");
    const extraTestimonials = document.querySelector(".extra-testimonials");

    if (seeMoreBtn && extraTestimonials) {
        seeMoreBtn.addEventListener("click", () => {
            extraTestimonials.classList.toggle("hidden");

            if (extraTestimonials.classList.contains("hidden")) {
                seeMoreBtn.innerHTML = 'See More <i class="fas fa-chevron-down"></i>';
            } else {
                seeMoreBtn.innerHTML = 'See Less <i class="fas fa-chevron-up"></i>';
            }
        });
    }
});