---
title: "WooCommerce to Shopify migration: a documented demo"
description: "A test WooCommerce store migrated to a Shopify development store: catalog, customers, orders, a 301 for every old URL, a before/after check and a domain switch that leaves email alone."
---
I'm Ivan, a web developer in Veracruz, Mexico. This is a test WooCommerce store ("Sotavento", with the sample catalog WooCommerce ships) that I migrated to a Shopify development store to show how I run a migration: what moves and how, what happens to every URL Google already knows, and how the domain switches over without taking email down. The store has no real sales; what you see is the process and its checks.

## 1. What this does for a store
- **Catalog, customers and orders complete on Shopify**, with images, variants and original dates, compared against the old store before the migration is called done.
- **No old URL returns a 404:** every page Google already knows 301-redirects to its equivalent and keeps its title and meta description. It's checked URL by URL, and the report is yours.
- **The domain switches without touching email:** MX, SPF, DKIM and DMARC records stay as they are, and a script verifies it right after the switch.

## 2. The source store

- WordPress 7 + WooCommerce in Docker, with Yoast SEO and permalinks like `/product/hoodie/`, as most real stores have.
- **18 products** (2 with variations, one grouped, one external), **6 categories**, **4 blog posts**, **4 pages**, **8 customers** and **10 orders** in different states (completed, processing, on hold, refunded). Every product, page and post has a meta description.
- Yoast's sitemap lists **38 URLs**. That's the list that has to survive.

![The "Hoodie" product page on the source WooCommerce store: color and logo pickers, price from $42 to $45, Add to cart button and the Hoodies category.](../../../assets/migracion/01-woo-product.png)

## 3. What moved and how

Everything through Shopify's API with my own scripts: they can run again without duplicating anything.

| From WooCommerce | On Shopify | Detail |
|---|---|---|
| 17 products | 17 products, 28 variants | Handle = the old slug, same price, sales as a compare-at price |
| "Any size" variation | One variant per size | Shopify has no "any": the 3-variation tee becomes 9 variants |
| Grouped product | Collection | Shopify has no grouped products |
| External product | Product linking to the seller | |
| 6 categories | 6 collections | With their meta descriptions |
| 22 images | Uploaded to Shopify | Never hot-linked to `wp-content`: the old server gets switched off |
| 4 pages, 4 posts | Pages and a "News" blog | Original date and meta description |
| 8 customers | 8 customers | Name, email, phone and address |
| 10 orders | 10 historical orders | Original date, payment and fulfillment status, total and customer, with no confirmation emails sent and no inventory touched. Compared one by one with WooCommerce: 0 differences |

![The Shopify admin product list (shown in Spanish): the 17 migrated products, all active, vendor Sotavento.](../../../assets/migracion/03-admin-products.jpg)

![The Hoodie product in the Shopify admin (shown in Spanish): 7 migrated images, the Hoodies collection and the Color (Blue, Red, Green) and Logo (Yes, No) options.](../../../assets/migracion/04-admin-hoodie.jpg)

Shopify numbers orders from #1001; the WooCommerce number stays as a tag (`woo-order-57`) so it can be searched. One order for the "any size" tee matches none of the new variants, so it stays as a line with its original title, SKU and price: order history doesn't get rewritten.

![The Shopify admin order list (shown in Spanish): #1001 to #1010 with their original dates, customers, totals, payment status (paid, refunded, pending), fulfillment status and each one's woo-order tag.](../../../assets/migracion/05-admin-orders.jpg)

Shopify only lets an app read and create customers through the API once it's installed as the store's custom app. On a real store, that's set up before migration day.

**Doesn't move:** customer passwords (Shopify can't import them; each customer gets an invite to activate their account), payment data, reviews and coupons. With a real store, each of these is agreed before work starts.

## 4. 301 redirects

Every old URL points at its Shopify equivalent. The rules:

| WooCommerce URL | Shopify URL |
|---|---|
| `/product/hoodie/` | `/products/hoodie` |
| `/product-category/hoodies/` | `/collections/hoodies` |
| `/how-to-pick-a-hoodie-size/` (post) | `/blogs/news/how-to-pick-a-hoodie-size` |
| `/about/` (page) | `/pages/about` |
| `/category/style-notes/` | `/blogs/news` |
| `/shop/`, `/cart/`, `/checkout/`, `/my-account/` | `/collections/all`, `/cart`, `/cart`, `/account` |

The redirects go into Shopify through the same CSV you'd import by hand in the admin (*URL redirects › Import*), built from the handles Shopify actually assigned: [download `redirects.csv`](/demo/migracion/redirects.csv).

![URL redirects in the Shopify admin (shown in Spanish): 36 imported redirects, from /category/style-notes to /blogs/news, /product/hoodie to /products/hoodie and /product-category/tshirts to /collections/tshirts, among others.](../../../assets/migracion/06-admin-redirects.jpg)

## 5. Before/after check

A script requests each of the 38 old URLs from the Shopify store, follows every redirect and compares the title and meta description with what WooCommerce had.

| Result | URLs |
|---|---|
| A single 301 to the right URL, page 200, same title and meta description | 29 |
| Shopify's own route (`/shop/`, `/cart/`, `/checkout/`): Shopify serves the page, the redirect doesn't apply | 3 |
| Correct 301, title changed on purpose: WordPress appends "Archives" to categories ("Hoodies Archives"); on Shopify it's "Hoodies" | 6 |
| **404** | **0** |

![The same page on Shopify, where the old URL /product/hoodie/ lands through a 301: "Hoodie", $45, Blue, Red and Green color buttons, Yes and No logo buttons, and the migrated image gallery.](../../../assets/migracion/02-shopify-product.png)

Full report, URL by URL: [download `reporte-migracion.csv`](/demo/migracion/reporte-migracion.csv).

What came out of the check rather than the plan: Shopify won't redirect `/cart/` (the route is its own) and answers `/shop` with the home page even though the redirect exists. Neither is a 404, and on a real store I flag it before the domain switch.

## 6. Switching the domain without breaking email

DNS is where migrations usually take email down: the zone gets wiped, Shopify's records get pasted in and the MX records are gone. Here it's a dry run against the real `ivanaguirre.dev` zone, read without changing anything:

| Record | Now | After |
|---|---|---|
| `@` A | 2 Cloudflare IPs | `23.227.38.65` |
| `@` AAAA | 2 Cloudflare IPs | `2620:127:f00f:5::` |
| `www` A / AAAA | Cloudflare IPs | deleted |
| `www` CNAME | none | `shops.myshopify.com.` |

**Untouched, record by record:** the 3 mail MX records, SPF, the DKIM key, DMARC, Klaviyo's verification and the `send.ivanaguirre.dev` delegation to Klaviyo: 11 records. Shopify's records go in unproxied (grey cloud on Cloudflare).

Before the switch I save a snapshot of the zone; right after, a script reads it again and fails if any mail record changed. Today, against the live zone: `mail records unchanged`.

## 7. Next steps on a real store
- Pull the URLs that get traffic from Search Console, not just the sitemap; the ones with visits or backlinks get checked one by one.
- Redirect old `/wp-content/uploads/` images that have backlinks.
- Lower the DNS TTL a day ahead and switch during the slowest sales hours.
- If the store already emails its customers, set Klaviyo up on top: [here's how I do it](/en/demo/klaviyo/).

## 8. Working with me
- **Access:** give me an admin user in WordPress and accept a Shopify collaborator request. For DNS, either give me access to your provider or I send you the exact list of records and you apply it. I never need your password.
- **Agencies:** I work inside your client's account, never contact them unless you ask, and you hand them a write-up like this page under your name.
- **Replies:** within 24 hours, in English or Spanish. My working day overlaps US business hours.

I'll migrate your store from WooCommerce to Shopify for a flat $300 USD, for catalogs up to 200 products: products, customers, past orders, pages, blog, every redirect with its report, and the domain switch. Email me at [hola@ivanaguirre.dev](mailto:hola@ivanaguirre.dev?subject=Migration) with "Migration" in the subject and a link to your store.
