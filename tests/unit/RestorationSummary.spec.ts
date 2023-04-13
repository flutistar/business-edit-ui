import Vue from 'vue'
import Vuetify from 'vuetify'
import flushPromises from 'flush-promises'
import sinon from 'sinon'
import { createLocalVue, createWrapper, mount } from '@vue/test-utils'
import RestorationSummary from '@/components/Restoration/RestorationSummary.vue'
import { ConfirmDialog as ConfirmDialogShared } from '@bcrs-shared-components/confirm-dialog/'
import EffectiveDateTime from '@/components/common/EffectiveDateTime.vue'
import NameTranslation from '@/components/common/YourCompany/NameTranslations/NameTranslation.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useStore } from '@/store/store'
import { CorpTypeCd } from '@/enums'

Vue.use(Vuetify)

const localVue = createLocalVue()
const vuetify = new Vuetify({})

xdescribe('Restoration Summary component', () => {
  let wrapper: any
  setActivePinia(createPinia())
  const store = useStore()

  const entitySnapshot = {
    businessInfo: {
      legalName: 'Mock Original Name',
      legalType: 'BC'
    }
  }
  const nameTranslationsListChanged = [
    { name: 'First mock name translation ltd.', action: 'edited' },
    { name: 'Second mock name translation inc' },
    { name: 'Third mock name translation ltd.' },
    { name: 'Quatrième nom simulé' }
  ]

  beforeAll(() => {
    // init store
    store.stateModel.currentJsDate = new Date('2020-03-01T16:30:00Z')
    store.stateModel.tombstone.currentDate = '2021-03-01'
    store.stateModel.entitySnapshot = entitySnapshot as any
    store.stateModel.shareStructureStep.shareClasses = []
    store.stateModel.entitySnapshot.shareStructure = { shareClasses: [] }
  })

  beforeEach(() => {
    // Set Original business Data
    store.stateModel.nameRequest.legalName = entitySnapshot.businessInfo.legalName
    store.stateModel.tombstone.entityType = entitySnapshot.businessInfo.legalType as CorpTypeCd
    store.stateModel.summaryMode = true
    store.stateModel.nameTranslations = nameTranslationsListChanged as any

    wrapper = mount(RestorationSummary, { vuetify, localVue })
  })

  afterEach(() => {
    sinon.restore()
    wrapper.destroy()
  })

  it('renders the components', async () => {
    expect(wrapper.findComponent(RestorationSummary).exists()).toBe(true)
    expect(wrapper.findComponent(EffectiveDateTime).exists()).toBe(true)
    expect(wrapper.findComponent(ConfirmDialogShared).exists()).toBe(true)
    expect(wrapper.findComponent(NameTranslation).exists()).toBe(true)
  })

  it('renders the Remove actions', async () => {
    const removeAction = wrapper.find('#btn-delete-restoration').text()
    expect(removeAction).toBe('Delete')
  })

  it('displays the confirm dialog when selecting Remove action', async () => {
    const mock = jest.spyOn(wrapper.vm, 'onDeleteClicked')
    expect(mock).not.toHaveBeenCalled()

    const rootWrapper = createWrapper(wrapper.vm.$root)
    expect(rootWrapper.emitted('delete-all')).toBeUndefined()

    // Select the remove action
    const removeAction = wrapper.find('#btn-delete-restoration')
    await removeAction.trigger('click')

    expect(mock).toHaveBeenCalled()
    expect(rootWrapper.emitted('delete-all').length).toBe(1)
  })

  it('does not render the summary sections when no changes have been made', async () => {
    expect(wrapper.find('.business-name-summary').exists()).toBe(false)
    expect(wrapper.find('.business-type-summary').exists()).toBe(false)
  })

  it('renders the name summary section when changes have been made', async () => {
    store.stateModel.nameRequest.legalName = 'Mock New Name'
    await Vue.nextTick()

    expect(wrapper.find('.business-name-summary').exists()).toBe(true)
    expect(wrapper.find('.business-name-summary').text()).toContain('Company Name Mock New Name')
  })

  it('renders the type summary section when changes have been made', async () => {
    store.stateModel.tombstone.entityType = CorpTypeCd.BENEFIT_COMPANY
    await Vue.nextTick()

    expect(wrapper.find('.business-type-summary').exists()).toBe(true)
    expect(wrapper.find('.business-type-summary').text()).toContain('Changing from a BC Limited Company')
    expect(wrapper.find('.business-type-summary').text()).toContain('to a BC Benefit Company')
  })

  it('renders the default restoration date and time section', async () => {
    store.stateModel.effectiveDateTime = {
      isFutureEffective: null,
      dateTimeString: ''
    }
    store.stateModel.validationFlags.flagsReviewCertify.isValidEffectiveDate = false
    await Vue.nextTick()

    // verify section
    expect(wrapper.find('.restoration-date-time').exists()).toBe(true)

    // verify info-text paragraph
    expect(wrapper.find('.restoration-date-time .info-text').exists()).toBe(true)
    expect(wrapper.find('.restoration-date-time .info-text').text()).toContain('Select the date and time')

    // verify effective-date-time div only (no the end blurb div)
    expect(wrapper.findAll('.restoration-date-time .v-card').length).toBe(1)
  })

  it('renders the restoration date and time section with end blurb', async () => {
    store.stateModel.effectiveDateTime = {
      isFutureEffective: true,
      dateTimeString: '2021-03-05T16:30:00Z'
    }
    store.stateModel.validationFlags.flagsReviewCertify.isValidEffectiveDate = true
    await Vue.nextTick()

    // verify end blurb div
    const divs = wrapper.findAll('.restoration-date-time .v-card')
    expect(divs.length).toBe(2)
    expect(divs.at(1).text()).toContain('The restoration for this business will be effective as of:')
    expect(divs.at(1).text()).toContain('March 5, 2021 at 8:30 am Pacific time')
  })

  it('renders Restoration Notice Changes fees accordingly', async () => {
    store.stateModel.currentFees = [{
      'filingFees': 100.0,
      'filingType': 'Restoration',
      'filingTypeCode': 'ALTER',
      'futureEffectiveFees': 0,
      'priorityFees': 0,
      'processingFees': 0,
      'serviceFees': 1.5,
      'tax': {
        'gst': 0,
        'pst': 0
      },
      'total': 101.5
    }]
    await Vue.nextTick()
    expect(wrapper.find('.summary-title').text()).toBe('Restoration Notice Changes ($100.00 Fee)')

    store.stateModel.currentFees = [{
      'filingFees': 100.0,
      'filingType': 'Restoration',
      'filingTypeCode': 'ALTER',
      'futureEffectiveFees': 100.0,
      'priorityFees': 0,
      'processingFees': 0,
      'serviceFees': 1.5,
      'tax': {
        'gst': 0,
        'pst': 0
      },
      'total': 201.5
    }]
    await Vue.nextTick()
    expect(wrapper.find('.summary-title').text()).toBe('Restoration Notice Changes ($200.00 Fee)')

    store.stateModel.currentFees = [{
      filingFees: null,
      filingType: null,
      filingTypeCode: null,
      futureEffectiveFees: null,
      priorityFees: null,
      processingFees: null,
      serviceFees: null,
      tax: {
        pst: null,
        gst: null
      },
      total: null
    }]

    await Vue.nextTick()
    expect(wrapper.find('.summary-title').text()).toBe('Restoration Notice Changes')
  })

  it('renders the futureEffective fee correctly', async () => {
    store.stateModel.feePrices = [{
      'filingFees': 100.0,
      'filingType': 'Restoration',
      'filingTypeCode': 'ALTER',
      'futureEffectiveFees': 100.0,
      'priorityFees': 0,
      'processingFees': 0,
      'serviceFees': 1.5,
      'tax': {
        'gst': 0,
        'pst': 0
      },
      'total': 201.5
    }]
    await Vue.nextTick()
    await flushPromises()
    await Vue.nextTick()
    expect(
      wrapper.find('#effective-date-time-instructions').text().replace(/\s+/g, ' ')
    ).toContain('additional fee of $100.00 to enter a restoration date and time in the future).')

    store.stateModel.feePrices = [{
      filingFees: null,
      filingType: null,
      filingTypeCode: null,
      futureEffectiveFees: null,
      priorityFees: null,
      processingFees: null,
      serviceFees: null,
      tax: {
        pst: null,
        gst: null
      },
      total: null
    }]

    await flushPromises()
    expect(
      wrapper.find('#effective-date-time-instructions').text().replace(/\s+/g, ' ')
    ).toContain('additional fee to enter a restoration date and time in the future).')
  })
})
