CREATE TABLE "public"."discounts" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "code"       text                     NOT NULL,
  "type"       text                     NOT NULL,
  "value"      integer                  NOT NULL,
  "active"     boolean                  NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "discounts_code_key" UNIQUE (code),
  CONSTRAINT "discounts_pkey" PRIMARY KEY (id),
  CONSTRAINT "discounts_type_check" CHECK ((type = ANY (ARRAY['percentage'::text, 'fixed'::text]))),
  CONSTRAINT "discounts_value_check" CHECK ((value > 0))
);

ALTER TABLE "public"."discounts"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."orders" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "email"            text                     NOT NULL,
  "status"           text                     NOT NULL DEFAULT 'pending'::text,
  "items"            jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "shipping_address" jsonb                    NOT NULL,
  "subtotal"         integer                  NOT NULL,
  "discount_total"   integer                  NOT NULL DEFAULT 0,
  "total"            integer                  NOT NULL,
  "currency"         text                     NOT NULL DEFAULT 'PLN'::text,
  "discount_code"    text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "orders_currency_check" CHECK ((currency = 'PLN'::text)),
  CONSTRAINT "orders_discount_total_check" CHECK ((discount_total >= 0)),
  CONSTRAINT "orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "orders_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'processing'::text, 'shipped'::text, 'completed'::text, 'cancelled'::text]))),
  CONSTRAINT "orders_subtotal_check" CHECK ((subtotal >= 0)),
  CONSTRAINT "orders_total_check" CHECK ((total >= 0))
);

ALTER TABLE "public"."orders"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."payment_events" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "order_id"          uuid                     NOT NULL,
  "provider"          text                     NOT NULL,
  "provider_event_id" text                     NOT NULL,
  "event_type"        text                     NOT NULL,
  "status"            text                     NOT NULL,
  "payload"           jsonb,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "payment_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "payment_events_provider_provider_event_id_key" UNIQUE (PROVIDER, provider_event_id)
);

ALTER TABLE "public"."payment_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."product_images" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "product_id"   uuid                     NOT NULL,
  "storage_path" text                     NOT NULL,
  "alt_text"     text                     NOT NULL,
  "position"     integer                  NOT NULL DEFAULT 0,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_images_alt_text_check" CHECK ((char_length(TRIM(BOTH FROM alt_text)) > 0)),
  CONSTRAINT "product_images_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_images_position_check" CHECK (("position" >= 0)),
  CONSTRAINT "product_images_product_id_position_key" UNIQUE (product_id, "position"),
  CONSTRAINT "product_images_storage_path_check" CHECK ((storage_path ~ '^products/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'::text)),
  CONSTRAINT "product_images_storage_path_key" UNIQUE (storage_path)
);

ALTER TABLE "public"."product_images"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."products" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "parent_id"         uuid,
  "type"              text                     NOT NULL,
  "slug"              text,
  "name"              text                     NOT NULL,
  "description"       text,
  "price"             integer,
  "currency"          text                     NOT NULL DEFAULT 'PLN'::text,
  "stock_quantity"    integer                  NOT NULL DEFAULT 0,
  "status"            text                     NOT NULL DEFAULT 'draft'::text,
  "bundle_product_id" uuid,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "products_currency_check" CHECK ((currency = 'PLN'::text)),
  CONSTRAINT "products_pkey" PRIMARY KEY (id),
  CONSTRAINT "products_price_check" CHECK ((price >= 0)),
  CONSTRAINT "products_slug_key" UNIQUE (slug),
  CONSTRAINT "products_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))),
  CONSTRAINT "products_stock_quantity_check" CHECK ((stock_quantity >= 0)),
  CONSTRAINT "products_type_check" CHECK ((type = ANY (ARRAY['product'::text, 'variant'::text, 'bundle'::text, 'bundle_item'::text])))
);

ALTER TABLE "public"."products"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."payment_events"
  ADD CONSTRAINT "payment_events_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE "public"."product_images"
  ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE "public"."products"
  ADD CONSTRAINT "products_bundle_product_id_fkey" FOREIGN KEY (bundle_product_id) REFERENCES public.products(id);

ALTER TABLE "public"."products"
  ADD CONSTRAINT "products_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.products(id) ON DELETE CASCADE;

CREATE INDEX product_images_product_position_idx ON public.product_images USING btree (product_id, "position");

CREATE POLICY "Public can read images for published catalogue items" ON "public"."product_images"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.products
  WHERE ((products.id = product_images.product_id) AND (products.status = 'published'::text) AND (products.type = ANY (ARRAY['product'::text, 'bundle'::text]))))));

CREATE POLICY "Public can read published products" ON "public"."products"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((status = 'published'::text));

CREATE POLICY "Public can read published catalogue image files" ON "storage"."objects"
  FOR SELECT
  TO "anon", "authenticated"
  USING (((bucket_id = 'product-images'::text) AND (EXISTS ( SELECT 1
   FROM (public.product_images
     JOIN public.products ON ((products.id = product_images.product_id)))
  WHERE ((product_images.storage_path = products.name) AND (products.status = 'published'::text) AND (products.type = ANY (ARRAY['product'::text, 'bundle'::text])))))));

COMMENT ON TABLE "public"."product_images" IS 'Catalogue images live in the private product-images bucket at products/<product UUID>/<filename>.';

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."discounts" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."orders" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payment_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_images" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."products" TO "anon", "authenticated", "postgres", "service_role";

