/*!
* Start Bootstrap - Clean Blog v6.0.9 (https://startbootstrap.com/theme/clean-blog)
* Copyright 2013-2023 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-clean-blog/blob/master/LICENSE)
*/
window.addEventListener('DOMContentLoaded', () => {
    let scrollPos = 0;
    const mainNav = document.getElementById('mainNav');
    if (mainNav) {
        const headerHeight = mainNav.clientHeight;
        window.addEventListener('scroll', function() {
            const currentTop = document.body.getBoundingClientRect().top * -1;
            if (currentTop < scrollPos) {
                // Scrolling Up
                if (currentTop > 0 && mainNav.classList.contains('is-fixed')) {
                    mainNav.classList.add('is-visible');
                } else {
                    mainNav.classList.remove('is-visible', 'is-fixed');
                }
            } else {
                // Scrolling Down
                mainNav.classList.remove(['is-visible']);
                if (currentTop > headerHeight && !mainNav.classList.contains('is-fixed')) {
                    mainNav.classList.add('is-fixed');
                }
            }
            scrollPos = currentTop;
        });
    }

    const footerCopyright = document.querySelector('footer .text-center.text-muted.fst-italic');
    if (footerCopyright && !footerCopyright.parentElement.querySelector('.site-tagline')) {
        const tagline = document.createElement('div');
        tagline.className = 'small text-center text-muted fst-italic site-tagline';
        tagline.textContent = 'Healthy made simple';
        footerCopyright.parentElement.insertBefore(tagline, footerCopyright);
    }
});
