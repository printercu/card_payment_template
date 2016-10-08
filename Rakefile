require 'active_support/core_ext/module/delegation'
require 'slim'

desc 'Support task'
task :env do
  require 'ostruct'
  require 'yaml'
  require 'active_support/all'
  require 'pry'
end

desc 'Build dev version'
task(dev: :env) { render(:dev) }

desc 'Build release version'
task(release: :env) { render(:release) }

desc 'Create soft links in www'
task ln: :env do
  dir =
    if ENV['merchant']
      TemplateProcessor::Dir.find(env['merchant'])
    else
      dirs = TemplateProcessor::Dir.all
      case dirs.size
      when 0 then raise 'Missing merchants'
      when 1 then dirs.first
      else raise 'Ambigious merchants'
      end
    end
  dir.symlink(ENV['locale'] || 'ru')
end

desc 'Pack templates into zip archive'
task :zip do
  cmd = 'zip -FSr archive.zip www \
    -x \*src/* www/*.html \*.DS_Store \*.gitkeep \*Thumbs.db'
  puts system(cmd)
end

task default: :dev

def render(env)
  TemplateProcessor::Dir.all(env: env).each(&:render)
end

module TemplateProcessor
  class Dir
    class << self
      def all(**options)
        ::Dir[Pathname.new('').join('www', 'merchant_templates', '*')].map do |x|
          new(x, options)
        end
      end

      def find(merchant)
        ::Dir[Pathname.new('').join('www', 'merchant_templates', merchant)].first.
          try { |x| new(x) }
      end
    end

    attr_reader :path, :options

    def initialize(path, **options)
      @path = Pathname.new path
      @options = options
    end

    def render
      template_options[:i18n].each_key do |locale|
        templates.each { |x| x.render_and_save(locale) }
      end
    end

    def symlink(locale)
      templates.each { |x| x.symlink(locale) }
    end

    def templates
      # dont use glob 'cause of {} in dirnames
      @templates ||= path.join('src').children.
        select { |x| x.to_s.end_with?('.slim') && !x.basename.to_s.start_with?('_') }.
        map { |x| Template.new x, template_options }
    end

    def env
      options[:env].try!(:to_sym) || :dev
    end

    # Load config from src/config.yml.
    def template_options
      @template_options ||= begin
        hash = {env: env.to_s.inquiry, i18n: {}, merchant_id: path.basename}
        yml_path = path.join('src', 'config.yml')
        hash.merge!(YAML.load_file(yml_path).symbolize_keys) if File.exist?(yml_path)
        hash.merge!(hash[env].try!(:symbolize_keys) || {})
      end
    end
  end

  class Template
    attr_reader :options, :path

    def initialize(path, **options)
      @path = Pathname.new path
      @options = OpenStruct.new(options)
    end

    # Render and write file for every locale.
    def render(locale, locals = {})
      context = Context.new(options, locale, self)
      slim_template = Slim::Template.new(path, **slim_options)
      result = slim_template.render(context, locals)
      result << "\n" unless result.end_with?("\n")
      result
    end

    def render_and_save(locale, *args)
      content = render(locale, *args)
      File.write(html_path(locale), content)
    end

    # Create symlinks in www.
    def symlink(locale)
      source = html_path(locale)
      target = source.join('..', '..', '..', '..', source.basename)
      target.delete if target.exist? || target.symlink?
      target.make_symlink(source.relative_path_from(target.dirname))
    end

    def html_path(locale)
      path.join '..', '..', locale, path.basename.to_s.sub(/\.slim$/, '.html')
    end

    def slim_options
      options.slim.try!(:symbolize_keys) || {}
    end
  end

  class Context < Struct.new(:options, :locale, :template)
    delegate :env, :i18n, :merchant_id, to: :options
    delegate :release?, to: :env

    # Simple translator.
    def t(key)
      i18n[locale][key] || i18n[options.default_locale][key] or raise "Translation mising #{key}"
    end

    def css_path(path)
      "merchant_templates/#{merchant_id}/your_css/#{path}"
    end

    def image_path(path)
      "merchant_templates/#{merchant_id}/your_images/#{path}"
    end

    def render(partial, locals = {})
      partial_path = template.path.dirname.join "_#{partial}.slim"
      Template.new(partial_path, options.to_h).render(locale, locals)
    end

    # Easily stub currencies in dev.
    def amount_with_currency(amount, currency, amount_test = nil, currency_test = nil)
      unless release?
        amount = amount_test if amount_test
        currency = currency_test if currency_test
      end
      "#{amount} <img src='/images/svg/currency/#{currency}.svg' alt='#{currency}'>"
    end

    def inspect
      "<#{self.class.name}##{object_id}>"
    end

    alias_method :to_s, :inspect
  end
end

Slim::Embedded::JavaScriptEngine.prepend(Module.new do
  # strip comments and empty lines
  def on_slim_embedded(engine, body)
    rejected = nil
    new_body = []
    body.each do |node|
      unless node.is_a?(Array)
        new_body << node
        rejected = false
        next
      end
      case node[0]
      when :newline
        new_body << node unless rejected
        rejected = false
      when :slim
        next unless node[1] == :interpolate
        rejected = node[2].match(%r{^\s+(//.*)?$})
        new_body << node unless rejected
      else
        new_body << node
      end
    end
    super(engine, new_body)
  end
end)
