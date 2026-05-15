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

    const footerTaglines = document.querySelectorAll('footer .small.text-muted.fst-italic, footer .small.text-center.text-muted.fst-italic');
    footerTaglines.forEach((tagline) => {
        if (!tagline.textContent || tagline.textContent.trim().toLowerCase() !== 'momoshare') {
            return;
        }

        const existingFacebookLink = tagline.parentElement?.querySelector('.footer-facebook-link');
        const existingHealthyMadeSimple = tagline.parentElement?.querySelector('.footer-healthy-made-simple');
        if (existingFacebookLink) existingFacebookLink.remove();
        if (existingHealthyMadeSimple) existingHealthyMadeSimple.remove();

        const facebookWrapper = document.createElement('div');
        facebookWrapper.className = 'small text-center text-muted footer-facebook-link';

        const facebookLink = document.createElement('a');
        facebookLink.href = 'https://www.facebook.com/haiyen.tran2';
        facebookLink.target = '_blank';
        facebookLink.rel = 'noopener noreferrer';
        facebookLink.setAttribute('aria-label', 'Facebook profile link');
        const facebookIcon = document.createElement('i');
        facebookIcon.className = 'fab fa-facebook-f';
        facebookLink.appendChild(facebookIcon);

        facebookWrapper.appendChild(facebookLink);
        tagline.insertAdjacentElement('beforebegin', facebookWrapper);

        const healthyMadeSimple = document.createElement('div');
        healthyMadeSimple.className = 'small text-center text-muted footer-healthy-made-simple';
        healthyMadeSimple.textContent = 'HEALTHY MADE SIMPLE';
        tagline.insertAdjacentElement('beforebegin', healthyMadeSimple);
    });
});
