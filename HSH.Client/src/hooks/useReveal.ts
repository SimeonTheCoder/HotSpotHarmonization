import { useEffect } from "react";

// adds the class "visible" to every ".reveal" element the first time it scrolls into view
function useReveal() {
    useEffect(() => {
        const items = document.querySelectorAll(".reveal");

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 },
        );

        items.forEach((item) => observer.observe(item));
        return () => observer.disconnect();
    }, []);
}

export default useReveal;
