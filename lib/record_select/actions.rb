module RecordSelect
  module Actions
    # :method => :get
    # params => [:page, :search]
    def browse
      conditions = record_select_conditions
      klass = record_select_config.model
      count = klass.count(:conditions => conditions, :include => record_select_includes)
      pager = ::Paginator.new(count, (params[:per_page] || record_select_config.per_page).to_i) do |offset, per_page|
        klass.find(:all,
          :offset => offset,
          :include => [record_select_includes, record_select_config.include].flatten.compact,
          :limit => per_page,
          :conditions => conditions,
          :order => record_select_config.order_by
        )
      end
      @page = pager.page(params[:page] || 1)

      render_record_select((params[:update] ? 'browse.rjs' : '_browse.rhtml')) and return if params[:format] == "js"
      render_record_select '_browse.rhtml', :layout => true
    end

    # :method => :post
    # params => [:id]
    def select
      klass = record_select_config.model
      record = klass.find(params[:id])
      if record_select_config.notify.is_a? Proc
        record_select_config.notify.call(record)
      elsif record_select_config.notify
        send(record_select_config.notify, record)
      end
      render :nothing => true
    end

    protected

    def record_select_config #:nodoc:
      self.class.record_select_config
    end

    def render_record_select(file, options = {}) #:nodoc:
      options[:layout] ||= false
      options[:file] = record_select_path_of(file)
      options[:use_full_path] = false
      render options
    end

    private

    def record_select_views_path
      @record_select_views_path ||= "vendor/plugins/#{File.expand_path(__FILE__).match(/vendor\/plugins\/(\w*)/)[1]}/lib/views"
    end

    def record_select_path_of(template)
      File.join(RAILS_ROOT, record_select_views_path, template)
    end
  end
end
